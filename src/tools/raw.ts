import { z } from "zod";
import { orgIdField, type ToolDef } from "./_shared.js";

export const rawTools: ToolDef[] = [
  {
    name: "apple_search_ads_request",
    description:
      "Escape hatch: invoke any Apple Ads API v5 endpoint by HTTP method and path. The server handles ES256 JWT authentication, X-AP-Context org header, retries on 401/429/5xx, and JSON parsing. Use only when no dedicated tool covers the endpoint you need (e.g. brand-new endpoints Apple has shipped that this server has not yet wrapped). Set noOrgContext=true for /me and /acls.",
    inputShape: {
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
      path: z
        .string()
        .min(1)
        .describe("Path under /api/v5, e.g. '/campaigns'. Leading slash optional."),
      query: z
        .record(z.union([z.string(), z.number(), z.boolean()]))
        .optional(),
      body: z.unknown().optional(),
      noOrgContext: z
        .boolean()
        .optional()
        .describe(
          "Skip the X-AP-Context header — required for /me and /acls.",
        ),
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const res = await client.request({
        method: input.method,
        path: input.path,
        query: input.query,
        body: input.body,
        noOrgContext: input.noOrgContext,
        orgId: input.orgId,
      });
      return res;
    },
  },
];
