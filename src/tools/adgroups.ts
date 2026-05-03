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
    age: z.object({ included: z.array(ageRangeSchema).optional() }).optional(),
    gender: z
      .object({ included: z.array(z.enum(["M", "F"])).optional() })
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
    "TargetingDimensions object. Per Apple: cannot be created or updated with geotargeting on campaigns that target multiple countriesOrRegions.",
  );

const adGroupBaseFields = {
  name: z.string().min(1).max(200),
  startTime: z.string().describe("ISO 8601 datetime."),
  endTime: z.string().optional(),
  defaultBidAmount: moneyField,
  cpaGoal: moneyField.optional(),
  biddingStrategy: z
    .enum(["MANUAL_CPT", "MAX_CONVERSIONS"])
    .optional()
    .describe(
      "Per Apple: in Maximize Conversions campaigns, defaultBidAmount is automatically managed and returned as 0.",
    ),
  automatedKeywordsOptIn: z
    .boolean()
    .optional()
    .describe("Enables Apple's Search Match keyword discovery."),
  pricingModel: z.enum(["CPC", "CPM"]).optional(),
  status: z.enum(["ENABLED", "PAUSED"]).optional(),
  targetingDimensions: targetingSchema.optional(),
  extra: z.record(z.unknown()).optional(),
} as const;

export const adGroupTools: ToolDef[] = [
  {
    name: "adgroups_create",
    description:
      "Creates an ad group as part of a campaign. Per Apple: ad groups cannot be created with geotargeting on campaigns that target multiple countriesOrRegions. Maximize Conversions campaigns require Search Match and an automatically-created ad group; without one Apple returns AUTOMATED_KEYWORDS_REQUIRED_AD_GROUP_MISSING and the campaign won't run. In automated ad groups: Search Match cannot be turned off; audience settings and keywords cannot be edited (but additional standard ad groups can be added with audience and keywords; negative keywords can also be added).",
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
    description:
      "Fetches a specific ad group with a campaign and ad group identifier. Supports partial fetch.",
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
    description:
      "Fetches all ad groups within a campaign. Supports partial fetch and pagination (max 1000 per page per Apple's general limit).",
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
    description:
      "Fetches ad groups within a single campaign using a selector. Per Apple: if you don't specify selector conditions, all ad groups in the campaign return.",
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
    description:
      "Fetches ad groups within an organization using a selector. Per Apple: if you don't specify selector conditions, all of your ad groups return.",
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
    description:
      "Updates an ad group with an ad group identifier. Partial updates are supported. Per Apple: ad groups cannot be updated with geotargeting on campaigns that target multiple countriesOrRegions — first call campaigns_update to clear that, then apply targetingDimensions here. For automated ad groups only the name field can be updated; defaultBidAmount cannot be set to non-zero/non-null, cpaGoal cannot be set to non-null, biddingStrategy and automatedKeywordsRequired are read-only, and automatedKeywordsOptIn can be toggled.",
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
    description:
      "Deletes an ad group with a campaign and ad group identifier. Apple's documentation does not state whether this is a soft or hard delete.",
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
