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
    "Where the ads can serve. Maximize Conversions only supports APPSTORE_SEARCH_RESULTS.",
  );

const campaignStatusEnum = z.enum(["ENABLED", "PAUSED"]);
const adChannelEnum = z.enum(["SEARCH", "DISPLAY"]);
const billingEventEnum = z.enum(["TAPS", "IMPRESSIONS"]);
const paymentModelEnum = z.enum(["LOC", "PAYG", "NOTCARD"]);

const biddingStrategyEnum = z
  .enum(["MANUAL_CPT", "MAX_CONVERSIONS"])
  .describe(
    "MANUAL_CPT (default) or MAX_CONVERSIONS. MAX_CONVERSIONS requires targetCpa and only supports APPSTORE_SEARCH_RESULTS.",
  );

const campaignBaseFields = {
  name: z.string().min(1).max(200).describe("Campaign name (max 200 chars)."),
  adamId: z
    .number()
    .int()
    .describe(
      "App's iTunes/Adam ID. Use search_apps to retrieve it. Use apps_eligibilities_find to confirm the app is eligible to promote.",
    ),
  biddingStrategy: biddingStrategyEnum.optional(),
  targetCpa: moneyField
    .optional()
    .describe("Required when biddingStrategy=MAX_CONVERSIONS."),
  budgetAmount: moneyField
    .optional()
    .describe(
      "Optional total campaign budget. Per Apple: budgetAmount can ONLY be set on create — campaigns_update cannot add or change it later.",
    ),
  dailyBudgetAmount: moneyField
    .optional()
    .describe("Required for the daily budget."),
  countriesOrRegions: z
    .array(z.string().length(2))
    .min(1)
    .describe(
      "ISO 3166-1 alpha-2 country codes. Group multiple markets in a single campaign by listing them here.",
    ),
  adChannelType: adChannelEnum,
  supplySources: z.array(supplySourceEnum).min(1),
  billingEvent: billingEventEnum,
  paymentModel: paymentModelEnum.optional(),
  locInvoiceDetails: locInvoiceDetailsSchema.optional(),
  status: campaignStatusEnum.optional(),
  startTime: z.string().optional().describe("ISO 8601 datetime."),
  endTime: z.string().optional().describe("ISO 8601 datetime."),
  budgetOrders: z
    .array(z.number().int())
    .optional()
    .describe("LOC accounts: array of budget order IDs."),
  extra: z
    .record(z.unknown())
    .optional()
    .describe("Extra fields merged into the request body verbatim."),
} as const;

export const campaignTools: ToolDef[] = [
  {
    name: "campaigns_create",
    description:
      "Creates a campaign to promote an app. Prerequisites per Apple's doc: call search_apps to obtain the adamId, and apps_eligibilities_find to confirm the app is eligible. dailyBudgetAmount is required; the optional budgetAmount can ONLY be set here — campaigns_update cannot add or change it. To use the Maximize Conversions bid strategy, set biddingStrategy=MAX_CONVERSIONS, provide targetCpa, and use only APPSTORE_SEARCH_RESULTS in supplySources.",
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
    description:
      "Fetches a specific campaign by campaign identifier. Per Apple: returns data for the specified campaign and supports partial fetch.",
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
      "Fetches all of an organization's assigned campaigns. Supports partial fetch and pagination (default page size 20, max 1000 per Apple's general limit). For filtering use campaigns_find.",
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
      "Fetches campaigns with selector operators. Per Apple: if you don't specify selector conditions, all campaign objects return in the response.",
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
      "Updates a campaign with a campaign identifier. Per Apple: use this to update countries or regions and to set the campaign budget; partial updates are supported and the body must use the { campaign: {...} } envelope. Switching to MAX_CONVERSIONS hides ad-group and keyword bids (returned as 0) and requires targetCpa plus an automated ad group; switching back to MANUAL_CPT requires targetCpa=null and restores prior bids if the campaign was previously manual. budgetAmount cannot be added via this endpoint — set it on create.",
    inputShape: {
      campaignId: z.number().int(),
      campaign: z
        .object({
          name: z.string().optional(),
          status: campaignStatusEnum.optional(),
          biddingStrategy: biddingStrategyEnum.optional(),
          targetCpa: moneyField.optional(),
          dailyBudgetAmount: moneyField.optional(),
          countriesOrRegions: z.array(z.string().length(2)).optional(),
          locInvoiceDetails: locInvoiceDetailsSchema.optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          budgetOrders: z.array(z.number().int()).optional(),
        })
        .passthrough()
        .describe("Partial campaign object — only the fields you want to update."),
      clearGeoTargetingOnCountryOrRegionChange: z
        .boolean()
        .optional()
        .describe(
          "Set true when changing countriesOrRegions, to clear ad-group geo targeting.",
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
    description:
      "Deletes a specific campaign by campaign identifier. Apple's documentation does not state whether this is a soft or hard delete.",
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
