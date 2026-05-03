import { request } from "undici";
import type { Dispatcher } from "undici";
import { AppleSearchAdsAuth } from "./auth.js";
import type { Config } from "./config.js";

export interface ApiPagination {
  totalResults?: number;
  startIndex?: number;
  itemsPerPage?: number;
}

export interface ApiError {
  messageCode?: string;
  message?: string;
  field?: string;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: ApiPagination;
  error?: { errors?: ApiError[] } | null;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Override the orgId for this single request. */
  orgId?: string;
  /** Skip injecting the X-AP-Context header (for /me, /acls, etc). */
  noOrgContext?: boolean;
  /** Override the Accept header (defaults to application/json). */
  accept?: string;
  /** Number of automatic retries on transient failures (429/5xx). */
  maxRetries?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export class AppleSearchAdsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: ApiError[] | undefined,
    public readonly rawBody: string,
  ) {
    super(message);
    this.name = "AppleSearchAdsApiError";
  }
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: RequestOptions["query"],
): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${cleanPath}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(headers: Dispatcher.ResponseData["headers"]): number | undefined {
  const raw = headers["retry-after"];
  if (!raw) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

export class AppleSearchAdsClient {
  private readonly auth: AppleSearchAdsAuth;

  constructor(private readonly config: Config) {
    this.auth = new AppleSearchAdsAuth(config);
  }

  resolveOrgId(orgId?: string): string {
    const effective = orgId ?? this.config.defaultOrgId;
    if (!effective) {
      throw new Error(
        "No orgId provided and ASA_ORG_ID is not set. " +
          "Pass orgId in the tool input or set the ASA_ORG_ID env var. " +
          "Use the org_acls tool to list orgIds you have access to.",
      );
    }
    return effective;
  }

  async request<T = unknown>(opts: RequestOptions): Promise<ApiResponse<T>> {
    const method = opts.method ?? "GET";
    const url = buildUrl(this.config.apiBaseUrl, opts.path, opts.query);
    const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

    let attempt = 0;
    let lastError: unknown;
    let didReauth = false;

    while (attempt <= maxRetries) {
      const token = await this.auth.getAccessToken();
      const headers: Record<string, string> = {
        authorization: `Bearer ${token}`,
        accept: opts.accept ?? "application/json",
      };
      if (!opts.noOrgContext) {
        headers["x-ap-context"] = `orgId=${this.resolveOrgId(opts.orgId)}`;
      }
      let body: string | undefined;
      if (opts.body !== undefined && opts.body !== null) {
        body = JSON.stringify(opts.body);
        headers["content-type"] = "application/json";
      }

      let res;
      try {
        res = await request(url, { method, headers, body });
      } catch (err) {
        lastError = err;
        if (attempt >= maxRetries) throw err;
        await delay(Math.min(1000 * 2 ** attempt, 8000));
        attempt++;
        continue;
      }

      const status = res.statusCode;
      const text = await res.body.text();

      if (status === 401 && !didReauth) {
        // Token might be revoked — force a fresh exchange and retry once.
        this.auth.invalidate();
        didReauth = true;
        attempt++;
        continue;
      }

      if (RETRYABLE_STATUSES.has(status) && attempt < maxRetries) {
        const wait = parseRetryAfter(res.headers) ?? Math.min(1000 * 2 ** attempt, 8000);
        await delay(wait);
        attempt++;
        continue;
      }

      if (status < 200 || status >= 300) {
        let errors: ApiError[] | undefined;
        try {
          const parsed = JSON.parse(text) as { error?: { errors?: ApiError[] } };
          errors = parsed.error?.errors;
        } catch {
          // body wasn't JSON — that's fine
        }
        const summary =
          errors && errors.length
            ? errors.map((e) => `${e.messageCode ?? ""} ${e.message ?? ""} ${e.field ? `(${e.field})` : ""}`.trim()).join("; ")
            : text.slice(0, 512);
        throw new AppleSearchAdsApiError(
          `Apple Search Ads API ${method} ${opts.path} failed (${status}): ${summary}`,
          status,
          errors,
          text,
        );
      }

      // 204 No Content
      if (status === 204 || text.length === 0) {
        return { data: null as unknown as T };
      }

      try {
        return JSON.parse(text) as ApiResponse<T>;
      } catch {
        throw new AppleSearchAdsApiError(
          `Apple Search Ads API returned non-JSON success body: ${text.slice(0, 256)}`,
          status,
          undefined,
          text,
        );
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Apple Search Ads request failed after ${maxRetries} retries`);
  }

  /**
   * Convenience: walk a paginated GET endpoint by following limit/offset.
   * Stops at `maxItems` (default 5000) to avoid runaway loops.
   */
  async paginate<T>(
    opts: Omit<RequestOptions, "method"> & { method?: "GET" },
    {
      pageSize = 1000,
      maxItems = 5000,
    }: { pageSize?: number; maxItems?: number } = {},
  ): Promise<{ items: T[]; pagination?: ApiPagination }> {
    const items: T[] = [];
    let offset = 0;
    let lastPagination: ApiPagination | undefined;

    while (items.length < maxItems) {
      const limit = Math.min(pageSize, maxItems - items.length);
      const res = await this.request<T[]>({
        ...opts,
        method: "GET",
        query: { ...(opts.query ?? {}), limit, offset },
      });
      lastPagination = res.pagination;
      const page = Array.isArray(res.data) ? res.data : [];
      items.push(...page);
      const total = res.pagination?.totalResults;
      if (page.length < limit) break;
      if (typeof total === "number" && offset + page.length >= total) break;
      offset += page.length;
    }

    return { items, pagination: lastPagination };
  }
}
