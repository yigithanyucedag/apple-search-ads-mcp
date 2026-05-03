import { z, type ZodRawShape, type ZodTypeAny } from "zod";
import type { AppleSearchAdsClient, ApiResponse } from "../client.js";

/**
 * One MCP tool. The handler runs against an authenticated client and returns
 * any JSON-serialisable value — `registerAll` wraps it in the MCP content shape.
 */
export interface ToolDef<S extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  inputShape: S;
  handler: (
    input: z.objectOutputType<S, ZodTypeAny>,
    ctx: ToolContext,
  ) => Promise<unknown>;
}

export interface ToolContext {
  client: AppleSearchAdsClient;
}

export const orgIdField = z
  .string()
  .min(1)
  .optional()
  .describe(
    "Override the org (account) for this call. Defaults to ASA_ORG_ID. Use the `org_acls` tool to discover orgIds.",
  );

export const limitField = z
  .number()
  .int()
  .min(1)
  .max(1000)
  .optional()
  .describe("Max items per page. Apple's hard cap is 1000 for most endpoints.");

export const offsetField = z
  .number()
  .int()
  .min(0)
  .optional()
  .describe("Result offset for pagination.");

/**
 * Selector object accepted by Apple's `/find` endpoints.
 *
 * See https://developer.apple.com/documentation/apple_search_ads/selector
 */
export const selectorSchema = z
  .object({
    conditions: z
      .array(
        z.object({
          field: z.string(),
          operator: z.enum([
            "EQUALS",
            "NOT_EQUALS",
            "CONTAINS",
            "STARTS_WITH",
            "ENDS_WITH",
            "GREATER_THAN",
            "LESS_THAN",
            "IN",
            "NOT_IN",
            "CONTAINS_ALL",
            "CONTAINS_ANY",
            "BETWEEN",
          ]),
          values: z.array(z.union([z.string(), z.number(), z.boolean()])),
        }),
      )
      .optional(),
    fields: z.array(z.string()).optional(),
    orderBy: z
      .array(
        z.object({
          field: z.string(),
          sortOrder: z.enum(["ASCENDING", "DESCENDING"]).default("ASCENDING"),
        }),
      )
      .optional(),
    pagination: z
      .object({
        limit: z.number().int().min(1).max(1000),
        offset: z.number().int().min(0).default(0),
      })
      .optional(),
  })
  .describe(
    "Selector object for /find endpoints. Combine conditions / fields / orderBy / pagination.",
  );

export type Selector = z.infer<typeof selectorSchema>;

/** Returns the JSON-shaped payload that the MCP SDK will wrap as text content. */
export function unwrap<T>(res: ApiResponse<T>): {
  data: T;
  pagination?: ApiResponse<T>["pagination"];
} {
  return { data: res.data, pagination: res.pagination };
}

/** Strip undefined values from a request body so we don't send sparse JSON. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}
