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
      .describe(
        "Creative identifier returned from creatives_create. Required.",
      ),
    creativeType: creativeTypeEnum.optional(),
    status: z.enum(["ENABLED", "PAUSED"]).optional(),
  })
  .passthrough();

export const adTools: ToolDef[] = [
  {
    name: "ads_create",
    description:
      "Creates an ad in an ad group with a creative. Per Apple: obtain creativeId from creatives_create first; the response id is your adId, used as the resource path in ads_get / ads_update / ads_delete and in ad-level reports. As of API v5.2 this endpoint also supports default product page ads. The adId is also output in the AdServices attribution framework.",
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
    description: "Fetches an ad assigned to an ad group by identifier.",
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
    description: "Fetches all ads assigned to an ad group.",
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
    description:
      "Finds ads within a campaign by selector criteria. Per Apple: if you don't specify selector conditions, all Ad objects return in the response.",
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
    description:
      "Fetches ads within an organization by selector criteria. Per Apple: if you don't specify selector conditions, all Ad objects return in the response.",
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
      "Updates an ad in an ad group. Per Apple: you can assign one active custom product page to an ad group. Partial updates supported.",
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
    description:
      "Deletes an ad assignment from an ad group. Returns a VoidResponse. Apple's documentation does not state whether this is a soft or hard delete.",
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
