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
  .describe("Selector for sort, filter, and pagination of report rows.");

const groupByEnum = z.enum([
  "adminArea",
  "ageRange",
  "countryCode",
  "countryOrRegion",
  "deviceClass",
  "gender",
  "locality",
]);

const reportBaseShape = {
  startTime: z.string(),
  endTime: z.string(),
  granularity: z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY"]).optional(),
  timeZone: z
    .enum(["UTC", "ORTZ"])
    .optional()
    .describe("ORTZ = the org's reporting timezone."),
  selector: reportSelectorSchema.optional(),
  groupBy: z.array(groupByEnum).optional(),
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
      "Fetches reports for campaigns. Per Apple: all ReportingCampaign fields are available to the orderBy Selector except servingStateReasons, app, app:{appName}, and app:{adamId}. In Maximize Conversions campaigns you can filter and order by biddingStrategy and targetCpa.",
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
    description:
      "Fetches reports for ad groups within a campaign. Per Apple: all ReportingAdGroup fields are available to the orderBy Selector except adGroupServingStateReasons. In Maximize Conversions campaigns defaultBidAmount is 0 and cpaGoal is null; you can filter and order by biddingStrategy and automatedKeywordsRequired.",
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
      "Fetches reports for targeting keywords within a campaign. Per Apple: all ReportingKeyword fields are available to the orderBy Selector. In Maximize Conversions campaigns bidAmount is 0 for keywords.",
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
    description:
      "Fetches reports for targeting keywords within an ad group. Per Apple: built for high-volume keyword reporting; all ReportingKeyword fields are available to the orderBy Selector.",
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
      "Fetches reports for search terms within a campaign. Per Apple: minimum 10 impressions for a row to appear; only timeZone=ORTZ is supported; all ReportingSearchTerm fields are available to the orderBy Selector.",
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
    description:
      "Fetches reports for search terms within an ad group. Per Apple: built for high-volume search-term reporting; minimum 10 impressions for a row to appear; only timeZone=ORTZ is supported.",
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
      "Fetches ad performance data within a campaign. Per Apple: orderBy is required for ad-level report requests; groupBy is restricted to the CountryOrRegion field. Historical APPSTORE_SEARCH_TAB ad-level metrics from before API v5.2 are reported under adId=-1; after v5.2 default product page ads are reported under real adIds. Installations can be mapped by adId via the AdServices attribution framework.",
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
