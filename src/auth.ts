import { importPKCS8, SignJWT, type KeyLike } from "jose";
import { request } from "undici";
import type { Config } from "./config.js";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const REFRESH_SKEW_SECONDS = 30;
const ASSERTION_LIFETIME_SECONDS = 60 * 60 * 24 * 180;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class AppleSearchAdsAuth {
  private cached?: CachedToken;
  private privateKeyPromise?: Promise<KeyLike | Uint8Array>;
  private inflight?: Promise<string>;

  constructor(private readonly config: Config) {}

  private getPrivateKey(): Promise<KeyLike | Uint8Array> {
    if (!this.privateKeyPromise) {
      this.privateKeyPromise = importPKCS8(this.config.privateKeyPem, "ES256");
    }
    return this.privateKeyPromise;
  }

  private async signClientAssertion(): Promise<string> {
    const key = await this.getPrivateKey();
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: this.config.keyId, typ: "JWT" })
      .setIssuer(this.config.teamId)
      .setSubject(this.config.clientId)
      .setAudience(this.config.tokenAudience)
      .setIssuedAt(now)
      .setExpirationTime(now + ASSERTION_LIFETIME_SECONDS)
      .sign(key);
  }

  private async exchangeForAccessToken(): Promise<CachedToken> {
    const assertion = await this.signClientAssertion();
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: assertion,
      scope: "searchadsorg",
    });
    const res = await request(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        host: new URL(this.config.tokenUrl).host,
        accept: "application/json",
      },
      body: body.toString(),
    });
    const text = await res.body.text();
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(
        `Apple OAuth token exchange failed (${res.statusCode}): ${text}`,
      );
    }
    let parsed: TokenResponse;
    try {
      parsed = JSON.parse(text) as TokenResponse;
    } catch {
      throw new Error(
        `Apple OAuth returned non-JSON response: ${text.slice(0, 256)}`,
      );
    }
    if (!parsed.access_token || typeof parsed.expires_in !== "number") {
      throw new Error(
        `Apple OAuth response missing access_token / expires_in: ${text.slice(0, 256)}`,
      );
    }
    return {
      accessToken: parsed.access_token,
      expiresAt: Date.now() + (parsed.expires_in - REFRESH_SKEW_SECONDS) * 1000,
    };
  }

  async getAccessToken(forceRefresh = false): Promise<string> {
    if (
      !forceRefresh &&
      this.cached &&
      this.cached.expiresAt > Date.now()
    ) {
      return this.cached.accessToken;
    }
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      try {
        this.cached = await this.exchangeForAccessToken();
        return this.cached.accessToken;
      } finally {
        this.inflight = undefined;
      }
    })();
    return this.inflight;
  }

  invalidate(): void {
    this.cached = undefined;
  }
}
