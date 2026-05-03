import { z } from "zod";
import { orgIdField, type ToolDef } from "./_shared.js";

export const rawTools: ToolDef[] = [
  {
    name: "apple_search_ads_request",
    description:
      "Escape hatch: call any Apple Search Ads endpoint by method + path. " +
      "Authentication and org context are handled for you. Use only if no dedicated tool covers the endpoint you need.",
    inputShape: {
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
      path: z
        .string()
        .min(1)
        .describe(
          "Path under /api/v5, e.g. '/campaigns' or '/reports/campaigns'. Leading slash optional.",
        ),
      query: z
        .record(z.union([z.string(), z.number(), z.boolean()]))
        .optional(),
      body: z.unknown().optional(),
      noOrgContext: z
        .boolean()
        .optional()
        .describe("Set true for endpoints like /me or /acls that don't accept X-AP-Context."),
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
