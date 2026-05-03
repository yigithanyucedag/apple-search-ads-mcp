import { z } from "zod";
import {
  compact,
  limitField,
  offsetField,
  orgIdField,
  unwrap,
  type ToolDef,
} from "./_shared.js";

/**
 * Impression-share / share-of-voice reports follow an async pattern:
 * 1) POST /custom-reports — kicks off the report, returns reportId.
 * 2) GET  /custom-reports/{reportId} — poll until state=COMPLETED.
 * 3) Read rows from the response payload.
 */
const sovSelectorSchema = z.object({
  conditions: z
    .array(
      z.object({
        field: z.enum(["countryOrRegion", "searchTerm"]),
        operator: z.literal("IN"),
        values: z.array(z.string()).min(1),
      }),
    )
    .optional(),
  fields: z.array(z.string()).optional(),
  orderBy: z
    .array(
      z.object({
        field: z.string(),
        sortOrder: z.enum(["ASCENDING", "DESCENDING"]),
      }),
    )
    .optional(),
  pagination: z
    .object({
      limit: z.number().int().min(1).max(1000),
      offset: z.number().int().min(0).default(0),
    })
    .optional(),
});

export const customReportTools: ToolDef[] = [
  {
    name: "custom_reports_create",
    description:
      "Create an Impression Share (Share of Voice) report — async. Returns a reportId you " +
      "poll with custom_reports_get until state=COMPLETED.",
    inputShape: {
      name: z.string().max(50),
      startTime: z.string().describe("YYYY-MM-DD."),
      endTime: z.string().describe("YYYY-MM-DD."),
      granularity: z.enum(["DAILY", "WEEKLY"]).optional(),
      dateRange: z
        .enum(["LAST_WEEK", "LAST_2_WEEKS", "LAST_4_WEEKS"])
        .optional()
        .describe("Required when granularity=WEEKLY in some configurations."),
      selector: sovSelectorSchema.optional(),
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const { orgId, ...body } = input;
      const res = await client.request({
        method: "POST",
        path: "/custom-reports",
        body: compact(body),
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "custom_reports_get",
    description:
      "Fetch a single Impression Share report — poll until state=COMPLETED to read rows " +
      "(rank, impressionShare, lowImpressionShare, highImpressionShare, searchPopularity).",
    inputShape: {
      reportId: z.string(),
      orgId: orgIdField,
    },
    handler: async ({ reportId, orgId }, { client }) => {
      const res = await client.request({
        path: `/custom-reports/${reportId}`,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "custom_reports_list",
    description: "List all Impression Share reports created in the org.",
    inputShape: {
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async ({ limit, offset, orgId }, { client }) => {
      const res = await client.request({
        path: "/custom-reports",
        query: { limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },
];
