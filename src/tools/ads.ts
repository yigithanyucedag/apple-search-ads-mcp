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

const creativeTypeEnum = z.enum([
  "CUSTOM_PRODUCT_PAGE",
  "DEFAULT_PRODUCT_PAGE",
  "CREATIVE_SET",
]);

const adCreateSchema = z
  .object({
    name: z.string().min(1),
    creativeId: z
      .number()
      .int()
      .describe("Creative ID returned by creatives_create. Ads bind to creatives, not directly to CPPs."),
    creativeType: creativeTypeEnum.optional(),
    status: z.enum(["ENABLED", "PAUSED"]).optional(),
  })
  .passthrough();

export const adTools: ToolDef[] = [
  {
    name: "ads_create",
    description:
      "Create an ad inside an ad group. Ads bind a Creative (creativeId) to the ad group; " +
      "the creative itself can wrap a Custom Product Page, Default Product Page, or Creative Set reference.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      ad: adCreateSchema,
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, ad, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/ads`,
        body: compact(ad),
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "ads_get",
    description: "Fetch a single ad by ID.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      adId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, adId, orgId }, { client }) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/ads/${adId}`,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "ads_list",
    description: "List all ads in an ad group.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, limit, offset, orgId }, { client }) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/ads`,
        query: { limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "ads_find_in_campaign",
    description: "Find ads across all ad groups in a campaign with a selector.",
    inputShape: {
      campaignId: z.number().int(),
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ campaignId, selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/ads/find`,
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "ads_find_org_wide",
    description: "Find ads across the entire org with a selector.",
    inputShape: {
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: "/ads/find",
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "ads_update",
    description:
      "Update an ad — typically status, name, or repointing to a different creativeId.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      adId: z.number().int(),
      ad: z
        .object({
          name: z.string().optional(),
          status: z.enum(["ENABLED", "PAUSED"]).optional(),
          creativeId: z.number().int().optional(),
        })
        .passthrough(),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, adId, ad, orgId }, { client }) => {
      const res = await client.request({
        method: "PUT",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/ads/${adId}`,
        body: compact(ad),
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "ads_delete",
    description: "Delete an ad.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      adId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, adId, orgId }, { client }) => {
      const res = await client.request({
        method: "DELETE",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/ads/${adId}`,
        orgId,
      });
      return unwrap(res);
    },
  },
];
