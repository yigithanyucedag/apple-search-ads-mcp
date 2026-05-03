import { z } from "zod";
import {
  compact,
  limitField,
  offsetField,
  orgIdField,
  unwrap,
  type ToolDef,
} from "./_shared.js";

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
      "Obtains a reportId for an Impression Share report; the reportId is then used by custom_reports_get. Per Apple: max 10 reports created per 24 hours; date range up to 30 days for any period after 2020-04-12; report fields cannot be edited or removed; WEEKLY granularity cannot use custom startTime/endTime — use dateRange instead.",
    inputShape: {
      name: z.string().max(50),
      startTime: z.string(),
      endTime: z.string(),
      granularity: z.enum(["DAILY", "WEEKLY"]).optional(),
      dateRange: z
        .enum(["LAST_WEEK", "LAST_2_WEEKS", "LAST_4_WEEKS"])
        .optional()
        .describe("Required when granularity=WEEKLY (instead of startTime/endTime)."),
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
      "Fetches a single Impression Share report containing metrics and metadata, by reportId from custom_reports_create.",
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
    description:
      "Fetches all Impression Share reports containing metrics and metadata. Per Apple: rate limit is 150 reports within 15 minutes; default page size is 20, max 50 (lower than other endpoints).",
    inputShape: {
      field: z
        .string()
        .optional()
        .describe("Field name to sort or filter on."),
      sortOrder: z
        .enum(["ASCENDING", "DESCENDING"])
        .optional()
        .describe("Order of grouped results."),
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async ({ field, sortOrder, limit, offset, orgId }, { client }) => {
      const res = await client.request({
        path: "/custom-reports",
        query: { field, sortOrder, limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },
];
