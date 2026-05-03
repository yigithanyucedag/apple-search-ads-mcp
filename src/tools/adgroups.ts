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

const moneyField = z.object({
  amount: z.string(),
  currency: z.string().length(3),
});

const targetingDimension = z
  .object({
    included: z.array(z.union([z.string(), z.number()])).optional(),
    excluded: z.array(z.union([z.string(), z.number()])).optional(),
  })
  .describe("Most targeting dimensions are { included: [...], excluded: [...] }.");

const ageRangeSchema = z
  .object({
    minAge: z.number().int().optional(),
    maxAge: z.number().int().optional(),
  })
  .partial();

const targetingSchema = z
  .object({
    age: z
      .object({
        included: z.array(ageRangeSchema).optional(),
      })
      .optional(),
    gender: z
      .object({
        included: z.array(z.enum(["M", "F"])).optional(),
      })
      .optional(),
    deviceClass: z
      .object({
        included: z.array(z.enum(["IPHONE", "IPAD"])).optional(),
      })
      .optional(),
    country: targetingDimension.optional(),
    adminArea: targetingDimension.optional(),
    locality: targetingDimension.optional(),
    appDownloaders: targetingDimension.optional(),
    appCategories: targetingDimension.optional(),
    daypart: z
      .object({
        userTime: z
          .object({
            included: z.array(z.number().int().min(0).max(167)).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough()
  .describe(
    "Audience targeting. All dimensions are { included: [...], excluded: [...] }. " +
      "Pass extra fields verbatim (e.g. customAudiences) — they're forwarded to Apple.",
  );

const adGroupBaseFields = {
  name: z.string().min(1).max(200),
  startTime: z.string().describe("ISO 8601 datetime in UTC."),
  endTime: z.string().optional(),
  defaultBidAmount: moneyField.describe("Cost per tap / install bid."),
  cpaGoal: moneyField.optional().describe("Optional cost-per-acquisition target."),
  biddingStrategy: z
    .enum(["MANUAL_CPT", "MAX_CONVERSIONS"])
    .optional()
    .describe("v5.5: MAX_CONVERSIONS enables automated bidding."),
  automatedKeywordsOptIn: z
    .boolean()
    .optional()
    .describe("Enable Apple's automatic keyword discovery."),
  pricingModel: z
    .enum(["CPC", "CPM"])
    .optional()
    .describe("Defaults are inferred from campaign.billingEvent."),
  status: z.enum(["ENABLED", "PAUSED"]).optional(),
  targetingDimensions: targetingSchema.optional(),
  extra: z.record(z.unknown()).optional(),
} as const;

export const adGroupTools: ToolDef[] = [
  {
    name: "adgroups_create",
    description:
      "Create an ad group within a campaign. Bid + targeting live here, not on the campaign.",
    inputShape: {
      campaignId: z.number().int(),
      ...adGroupBaseFields,
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const { campaignId, extra, orgId, ...rest } = input;
      const body = compact({ ...rest, ...(extra ?? {}) });
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/adgroups`,
        body,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "adgroups_get",
    description: "Fetch a single ad group.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, orgId }, { client }) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}`,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "adgroups_list",
    description: "List all ad groups in a campaign (paginated).",
    inputShape: {
      campaignId: z.number().int(),
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async ({ campaignId, limit, offset, orgId }, { client }) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}/adgroups`,
        query: { limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "adgroups_find_in_campaign",
    description: "Find ad groups within a single campaign using a selector.",
    inputShape: {
      campaignId: z.number().int(),
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ campaignId, selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/adgroups/find`,
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "adgroups_find_org_wide",
    description: "Find ad groups across the entire org with a selector.",
    inputShape: {
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: "/adgroups/find",
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "adgroups_update",
    description: "Update an ad group. Pass only the fields you want to change.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      adGroup: z
        .object({
          name: z.string().optional(),
          status: z.enum(["ENABLED", "PAUSED"]).optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          defaultBidAmount: moneyField.optional(),
          cpaGoal: moneyField.optional(),
          biddingStrategy: z
            .enum(["MANUAL_CPT", "MAX_CONVERSIONS"])
            .optional(),
          automatedKeywordsOptIn: z.boolean().optional(),
          targetingDimensions: targetingSchema.optional(),
        })
        .passthrough(),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, adGroup, orgId }, { client }) => {
      const res = await client.request({
        method: "PUT",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}`,
        body: adGroup,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "adgroups_delete",
    description: "Delete an ad group.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, orgId }, { client }) => {
      const res = await client.request({
        method: "DELETE",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}`,
        orgId,
      });
      return unwrap(res);
    },
  },
];
