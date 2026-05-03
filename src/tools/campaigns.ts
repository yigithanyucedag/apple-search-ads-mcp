import { z } from "zod";
import {
  compact,
  limitField,
  offsetField,
  orgIdField,
  selectorSchema,
  unwrap,
  type ToolDef,
} from "./_shared.js";

const moneyField = z
  .object({
    amount: z.string().describe("Decimal amount as a string, e.g. '100.00'."),
    currency: z.string().length(3).describe("ISO 4217 currency code, e.g. 'USD'."),
  })
  .describe("Apple represents money as { amount, currency }.");

const locInvoiceDetailsSchema = z
  .object({
    billingContactEmail: z.string().email().optional(),
    buyerEmail: z.string().email().optional(),
    buyerName: z.string().optional(),
    clientName: z.string().optional(),
    orderNumber: z.string().optional(),
  })
  .describe("Required only for LOC (line-of-credit) accounts.");

const supplySourceEnum = z
  .enum([
    "APPSTORE_SEARCH_RESULTS",
    "APPSTORE_SEARCH_TAB",
    "APPSTORE_TODAY_TAB",
    "APPSTORE_PRODUCT_PAGES_BROWSE",
  ])
  .describe(
    "Where the ads can serve. Most campaigns use APPSTORE_SEARCH_RESULTS.",
  );

const campaignStatusEnum = z.enum(["ENABLED", "PAUSED"]);
const adChannelEnum = z.enum(["SEARCH", "DISPLAY"]);
const billingEventEnum = z.enum(["TAPS", "IMPRESSIONS"]);
const paymentModelEnum = z.enum(["LOC", "PAYG", "NOTCARD"]);

const biddingStrategyEnum = z
  .enum(["MANUAL_CPT", "MAX_CONVERSIONS"])
  .describe("MANUAL_CPT (classic) or MAX_CONVERSIONS (v5.5 automated bidding).");

const campaignBaseFields = {
  name: z.string().min(1).max(200).describe("Campaign name (max 200 chars)."),
  adamId: z
    .number()
    .int()
    .describe("App's iTunes/Adam ID — find via the search_apps tool."),
  biddingStrategy: biddingStrategyEnum.optional(),
  targetCpa: moneyField
    .optional()
    .describe("Required when biddingStrategy=MAX_CONVERSIONS."),
  budgetAmount: moneyField
    .optional()
    .describe(
      "Total campaign budget. Required for PAYG/NOTCARD; not used for LOC.",
    ),
  dailyBudgetAmount: moneyField.optional().describe("Daily campaign budget."),
  countriesOrRegions: z
    .array(z.string().length(2))
    .min(1)
    .describe("ISO 3166-1 alpha-2 country codes the campaign targets."),
  adChannelType: adChannelEnum.describe(
    "SEARCH (App Store search results) or DISPLAY (Today/Search/Product page tabs).",
  ),
  supplySources: z
    .array(supplySourceEnum)
    .min(1)
    .describe("One or more ad placements."),
  billingEvent: billingEventEnum.describe(
    "TAPS for CPT campaigns, IMPRESSIONS for Today/Search-Tab CPM campaigns.",
  ),
  paymentModel: paymentModelEnum.optional(),
  locInvoiceDetails: locInvoiceDetailsSchema.optional(),
  status: campaignStatusEnum.optional().describe("Defaults to ENABLED."),
  startTime: z
    .string()
    .optional()
    .describe("ISO 8601 start datetime (UTC). Defaults to now."),
  endTime: z
    .string()
    .optional()
    .describe("ISO 8601 end datetime (UTC). Optional."),
  budgetOrders: z
    .array(z.number().int())
    .optional()
    .describe("LOC-only: array of budget order IDs."),
  extra: z
    .record(z.unknown())
    .optional()
    .describe(
      "Escape hatch: extra fields merged into the campaign object verbatim.",
    ),
} as const;

export const campaignTools: ToolDef[] = [
  {
    name: "campaigns_create",
    description:
      "Create a new campaign. The minimum useful body specifies adamId, name, " +
      "countriesOrRegions, adChannelType, supplySources, billingEvent, and a budget.",
    inputShape: { ...campaignBaseFields, orgId: orgIdField },
    handler: async (input, { client }) => {
      const { extra, orgId, ...rest } = input;
      const body = compact({ ...rest, ...(extra ?? {}) });
      const res = await client.request({
        method: "POST",
        path: "/campaigns",
        body,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "campaigns_get",
    description: "Fetch a single campaign by ID.",
    inputShape: {
      campaignId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, orgId }, { client }) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}`,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "campaigns_list",
    description:
      "List all campaigns in the org (paginated). For richer filtering use campaigns_find.",
    inputShape: {
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async ({ limit, offset, orgId }, { client }) => {
      const res = await client.request({
        path: "/campaigns",
        query: { limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "campaigns_find",
    description:
      "Search campaigns with a selector — supports conditions (EQUALS/IN/CONTAINS/...), orderBy, and pagination.",
    inputShape: {
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: "/campaigns/find",
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "campaigns_update",
    description:
      "Update a campaign. Pass only the fields you want to change. " +
      "Use clearGeoTargetingOnCountryOrRegionChange=true if you change countriesOrRegions.",
    inputShape: {
      campaignId: z.number().int(),
      campaign: z
        .object({
          name: z.string().optional(),
          status: campaignStatusEnum.optional(),
          biddingStrategy: biddingStrategyEnum.optional(),
          targetCpa: moneyField.optional(),
          budgetAmount: moneyField.optional(),
          dailyBudgetAmount: moneyField.optional(),
          countriesOrRegions: z.array(z.string().length(2)).optional(),
          locInvoiceDetails: locInvoiceDetailsSchema.optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          budgetOrders: z.array(z.number().int()).optional(),
        })
        .passthrough()
        .describe("Partial campaign object — fields you want to update."),
      clearGeoTargetingOnCountryOrRegionChange: z
        .boolean()
        .optional()
        .describe(
          "Set to true if changing countriesOrRegions, to clear ad-group geo targeting.",
        ),
      orgId: orgIdField,
    },
    handler: async (
      { campaignId, campaign, clearGeoTargetingOnCountryOrRegionChange, orgId },
      { client },
    ) => {
      const res = await client.request({
        method: "PUT",
        path: `/campaigns/${campaignId}`,
        body: compact({
          campaign,
          clearGeoTargetingOnCountryOrRegionChange,
        }),
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "campaigns_delete",
    description: "Permanently delete a campaign. Cannot be undone.",
    inputShape: {
      campaignId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, orgId }, { client }) => {
      const res = await client.request({
        method: "DELETE",
        path: `/campaigns/${campaignId}`,
        orgId,
      });
      return unwrap(res);
    },
  },
];
