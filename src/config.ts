import { readFileSync } from "node:fs";

export interface Config {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKeyPem: string;
  defaultOrgId?: string;
  apiBaseUrl: string;
  tokenUrl: string;
  tokenAudience: string;
}

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required env var ${name}. See .env.example for setup instructions.`,
    );
  }
  return value;
}

function loadPrivateKey(env: NodeJS.ProcessEnv): string {
  const inline = env.ASA_PRIVATE_KEY;
  if (inline && inline.trim() !== "") {
    // Allow `\n` escapes when passed via JSON-style env injection.
    return inline.includes("\\n") ? inline.replace(/\\n/g, "\n") : inline;
  }
  const path = env.ASA_PRIVATE_KEY_PATH;
  if (path && path.trim() !== "") {
    try {
      return readFileSync(path, "utf8");
    } catch (err) {
      throw new Error(
        `Could not read private key at ASA_PRIVATE_KEY_PATH=${path}: ${(err as Error).message}`,
      );
    }
  }
  throw new Error(
    "Provide either ASA_PRIVATE_KEY (PEM contents) or ASA_PRIVATE_KEY_PATH (path to .p8 / .pem file).",
  );
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    clientId: required("ASA_CLIENT_ID", env.ASA_CLIENT_ID),
    teamId: required("ASA_TEAM_ID", env.ASA_TEAM_ID),
    keyId: required("ASA_KEY_ID", env.ASA_KEY_ID),
    privateKeyPem: loadPrivateKey(env),
    defaultOrgId: env.ASA_ORG_ID,
    apiBaseUrl:
      env.ASA_API_BASE_URL?.replace(/\/+$/, "") ??
      "https://api.searchads.apple.com/api/v5",
    tokenUrl: env.ASA_TOKEN_URL ?? "https://appleid.apple.com/auth/oauth2/token",
    tokenAudience: env.ASA_TOKEN_AUDIENCE ?? "https://appleid.apple.com",
  };
}
