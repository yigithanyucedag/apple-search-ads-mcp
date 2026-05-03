import { z } from "zod";
import { compact, orgIdField, unwrap, type ToolDef } from "./_shared.js";

const reportSelectorSchema = z
  .object({
    orderBy: z
      .array(
        z.object({
          field: z.string(),
          sortOrder: z.enum(["ASCENDING", "DESCENDING"]),
        }),
      )
      .optional(),
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
            "BETWEEN",
            "CONTAINS_ALL",
            "CONTAINS_ANY",
          ]),
          values: z.array(z.union([z.string(), z.number(), z.boolean()])),
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
  .describe("Selector controlling sort, filtering, and pagination of the report rows.");

const groupByEnum = z
  .enum([
    "adminArea",
    "ageRange",
    "countryCode",
    "countryOrRegion",
    "deviceClass",
    "gender",
    "locality",
  ])
  .describe(
    "Pivot dimension. Apple restricts which combinations are valid: with demographic (gender/ageRange) you must omit granularity and set returnRowTotals=false.",
  );

const reportBaseShape = {
  startTime: z
    .string()
    .describe(
      "Inclusive start. Format YYYY-MM-DD for DAILY/WEEKLY/MONTHLY, or ISO 8601 datetime for HOURLY.",
    ),
  endTime: z.string().describe("Inclusive end."),
  granularity: z
    .enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY"])
    .optional()
    .describe("Defaults to none (single aggregated row per entity)."),
  timeZone: z
    .enum(["UTC", "ORTZ"])
    .optional()
    .describe("ORTZ = the org's reporting timezone."),
  selector: reportSelectorSchema.optional(),
  groupBy: z
    .array(groupByEnum)
    .optional()
    .describe("Pivot the report along these dimensions."),
  returnRecordsWithNoMetrics: z.boolean().optional(),
  returnRowTotals: z.boolean().optional(),
  returnGrandTotals: z.boolean().optional(),
} as const;

function buildBody(input: Record<string, unknown>) {
  return compact({
    startTime: input.startTime,
    endTime: input.endTime,
    granularity: input.granularity,
    timeZone: input.timeZone,
    selector: input.selector,
    groupBy: input.groupBy,
    returnRecordsWithNoMetrics: input.returnRecordsWithNoMetrics,
    returnRowTotals: input.returnRowTotals,
    returnGrandTotals: input.returnGrandTotals,
  });
}

export const reportTools: ToolDef[] = [
  {
    name: "reports_campaigns",
    description:
      "Campaign-level performance report. Returns rows with impressions, taps, installs, spend, " +
      "CPT/CPM/CPI, conversion rate, etc. Pass groupBy to pivot by country, device, age, gender.",
    inputShape: { ...reportBaseShape, orgId: orgIdField },
    handler: async (input, { client }) => {
      const res = await client.request({
        method: "POST",
        path: "/reports/campaigns",
        body: buildBody(input),
        orgId: input.orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "reports_adgroups",
    description: "Ad-group-level report within a single campaign.",
    inputShape: {
      campaignId: z.number().int(),
      ...reportBaseShape,
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/reports/campaigns/${input.campaignId}/adgroups`,
        body: buildBody(input),
        orgId: input.orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "reports_keywords_in_campaign",
    description:
      "Keyword report rolled up across all ad groups in one campaign.",
    inputShape: {
      campaignId: z.number().int(),
      ...reportBaseShape,
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/reports/campaigns/${input.campaignId}/keywords`,
        body: buildBody(input),
        orgId: input.orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "reports_keywords_in_adgroup",
    description: "Keyword report scoped to a single ad group.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      ...reportBaseShape,
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/reports/campaigns/${input.campaignId}/adgroups/${input.adGroupId}/keywords`,
        body: buildBody(input),
        orgId: input.orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "reports_search_terms_in_campaign",
    description:
      "Search-terms report rolled up across all ad groups in a campaign. " +
      "Reveals what users actually typed — harvest new keywords or negatives from here.",
    inputShape: {
      campaignId: z.number().int(),
      ...reportBaseShape,
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/reports/campaigns/${input.campaignId}/searchterms`,
        body: buildBody(input),
        orgId: input.orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "reports_search_terms_in_adgroup",
    description: "Search-terms report scoped to a single ad group.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      ...reportBaseShape,
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/reports/campaigns/${input.campaignId}/adgroups/${input.adGroupId}/searchterms`,
        body: buildBody(input),
        orgId: input.orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "reports_ads_in_campaign",
    description:
      "Ad-level performance (per Custom Product Page / creative variation) rolled up across the campaign.",
    inputShape: {
      campaignId: z.number().int(),
      ...reportBaseShape,
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/reports/campaigns/${input.campaignId}/ads`,
        body: buildBody(input),
        orgId: input.orgId,
      });
      return unwrap(res);
    },
  },
];
