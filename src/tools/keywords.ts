import { z } from "zod";
import {
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

const targetingKeywordSchema = z
  .object({
    text: z.string().min(1),
    matchType: z.enum(["BROAD", "EXACT"]),
    bidAmount: moneyField.describe(
      "In Maximize Conversions campaigns this must be omitted, null, or 0 — Apple manages bids automatically.",
    ),
    status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  })
  .passthrough();

const targetingKeywordUpdateSchema = z
  .object({
    id: z.number().int(),
    text: z.string().optional(),
    matchType: z.enum(["BROAD", "EXACT"]).optional(),
    bidAmount: moneyField.optional(),
    status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  })
  .passthrough();

const negativeKeywordSchema = z
  .object({
    text: z.string().min(1),
    matchType: z.enum(["BROAD", "EXACT"]),
    status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  })
  .passthrough();

const negativeKeywordUpdateSchema = z
  .object({
    id: z.number().int(),
    text: z.string().optional(),
    matchType: z.enum(["BROAD", "EXACT"]).optional(),
    status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  })
  .passthrough();

export const keywordTools: ToolDef[] = [
  // ---------- Targeting keywords ----------
  {
    name: "targeting_keywords_create",
    description:
      "Creates targeting keywords in an ad group. Per Apple: limit is 5,000 targeting keywords per campaign and per ad group; keywords belong to a specific ad group (unlike negative keywords, which can also live at the campaign level). Duplicate keywords cause the payload response to indicate an error but the call still returns HTTP 200. Cannot be created in automated ad groups; in Maximize Conversions campaigns bidAmount must be omitted, null, or 0.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      keywords: z.array(targetingKeywordSchema).min(1).max(1000),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, keywords, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords/bulk`,
        body: keywords,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "targeting_keywords_get",
    description:
      "Fetches a specific targeting keyword in an ad group. Supports partial fetch.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      keywordId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async (
      { campaignId, adGroupId, keywordId, orgId },
      { client },
    ) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords/${keywordId}`,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "targeting_keywords_list",
    description:
      "Fetches all targeting keywords in an ad group. Supports partial fetch and pagination.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async (
      { campaignId, adGroupId, limit, offset, orgId },
      { client },
    ) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords`,
        query: { limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "targeting_keywords_find",
    description:
      "Finds targeting keywords across all ad groups in a single campaign using a selector. Per Apple: if you don't specify any selector conditions, the API returns all keywords across all ad groups of the campaign.",
    inputShape: {
      campaignId: z.number().int(),
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ campaignId, selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/adgroups/targetingkeywords/find`,
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "targeting_keywords_update",
    description:
      "Updates targeting keywords in an ad group. Per Apple: each entry's id must belong to a keyword that exists inside the ad group in the URI; status and bidAmount are modifiable; partial updates are supported. In Maximize Conversions campaigns bidAmount cannot be changed to a non-zero/non-null value.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      keywords: z.array(targetingKeywordUpdateSchema).min(1).max(1000),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, keywords, orgId }, { client }) => {
      const res = await client.request({
        method: "PUT",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords/bulk`,
        body: keywords,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "targeting_keywords_delete",
    description:
      "Deletes targeting keywords from an ad group in bulk. Per Apple: this is a soft deletion. Returns IntegerResponse.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      keywordIds: z.array(z.number().int()).min(1).max(1000),
      orgId: orgIdField,
    },
    handler: async (
      { campaignId, adGroupId, keywordIds, orgId },
      { client },
    ) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords/delete/bulk`,
        body: keywordIds,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "targeting_keywords_delete_single",
    description:
      "Deletes one targeting keyword by id. Per Apple: this is a soft deletion. Returns VoidResponse.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      keywordId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async (
      { campaignId, adGroupId, keywordId, orgId },
      { client },
    ) => {
      const res = await client.request({
        method: "DELETE",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords/${keywordId}`,
        orgId,
      });
      return unwrap(res);
    },
  },

  // ---------- Ad-group-level negative keywords ----------
  {
    name: "adgroup_negative_keywords_create",
    description:
      "Creates negative keywords in a specific ad group. Per Apple: negative keywords prevent your ad from showing up in App Store searches and can belong to either a campaign or an ad group.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      keywords: z.array(negativeKeywordSchema).min(1).max(1000),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, keywords, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/negativekeywords/bulk`,
        body: keywords,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "adgroup_negative_keywords_get",
    description:
      "Fetches a specific negative keyword in an ad group. Supports partial fetch.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      keywordId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async (
      { campaignId, adGroupId, keywordId, orgId },
      { client },
    ) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/negativekeywords/${keywordId}`,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "adgroup_negative_keywords_list",
    description:
      "Fetches all negative keywords in an ad group. Supports partial fetch and pagination.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async (
      { campaignId, adGroupId, limit, offset, orgId },
      { client },
    ) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/negativekeywords`,
        query: { limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "adgroup_negative_keywords_find",
    description:
      "Finds negative keywords in different ad groups within the same campaign. Per Apple: if you don't specify any selector conditions, the API returns all negative keywords across all ad groups of the campaign.",
    inputShape: {
      campaignId: z.number().int(),
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ campaignId, selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/adgroups/negativekeywords/find`,
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "adgroup_negative_keywords_update",
    description:
      "Updates negative keywords in an ad group. Per Apple: each entry's id must belong to a negative keyword that exists inside the ad group in the URI; use PAUSED or ACTIVE for the status field; partial updates are supported.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      keywords: z.array(negativeKeywordUpdateSchema).min(1).max(1000),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, adGroupId, keywords, orgId }, { client }) => {
      const res = await client.request({
        method: "PUT",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/negativekeywords/bulk`,
        body: keywords,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "adgroup_negative_keywords_delete",
    description:
      "Deletes negative keywords from an ad group in bulk. Per Apple: this is a soft deletion. Returns IntegerResponse.",
    inputShape: {
      campaignId: z.number().int(),
      adGroupId: z.number().int(),
      keywordIds: z.array(z.number().int()).min(1).max(1000),
      orgId: orgIdField,
    },
    handler: async (
      { campaignId, adGroupId, keywordIds, orgId },
      { client },
    ) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/adgroups/${adGroupId}/negativekeywords/delete/bulk`,
        body: keywordIds,
        orgId,
      });
      return unwrap(res);
    },
  },

  // ---------- Campaign-level negative keywords ----------
  {
    name: "campaign_negative_keywords_create",
    description:
      "Creates negative keywords for a campaign (apply across all ad groups). Per Apple: duplicate keywords cause the payload response to indicate an error but the call still returns HTTP 200.",
    inputShape: {
      campaignId: z.number().int(),
      keywords: z.array(negativeKeywordSchema).min(1).max(1000),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, keywords, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/negativekeywords/bulk`,
        body: keywords,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "campaign_negative_keywords_get",
    description:
      "Fetches a specific negative keyword in a campaign. Supports partial fetch.",
    inputShape: {
      campaignId: z.number().int(),
      keywordId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, keywordId, orgId }, { client }) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}/negativekeywords/${keywordId}`,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "campaign_negative_keywords_list",
    description:
      "Fetches all negative keywords in a campaign. Supports partial fetch and pagination.",
    inputShape: {
      campaignId: z.number().int(),
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async ({ campaignId, limit, offset, orgId }, { client }) => {
      const res = await client.request({
        path: `/campaigns/${campaignId}/negativekeywords`,
        query: { limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "campaign_negative_keywords_find",
    description:
      "Fetches negative keywords for a campaign. Per Apple: if you don't specify any selector conditions, all negative keywords in the campaign return.",
    inputShape: {
      campaignId: z.number().int(),
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ campaignId, selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/negativekeywords/find`,
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "campaign_negative_keywords_update",
    description:
      "Updates negative keywords in a campaign. Per Apple: each entry's id must belong to a negative keyword that exists inside the campaign in the URI; use PAUSED or ACTIVE for the status field; partial updates are supported. Negative keywords can be created in both standard and automated ad groups.",
    inputShape: {
      campaignId: z.number().int(),
      keywords: z.array(negativeKeywordUpdateSchema).min(1).max(1000),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, keywords, orgId }, { client }) => {
      const res = await client.request({
        method: "PUT",
        path: `/campaigns/${campaignId}/negativekeywords/bulk`,
        body: keywords,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "campaign_negative_keywords_delete",
    description:
      "Deletes negative keywords from a campaign by id. Returns IntegerResponse. Apple's documentation does not state whether this is a soft or hard delete.",
    inputShape: {
      campaignId: z.number().int(),
      keywordIds: z.array(z.number().int()).min(1).max(1000),
      orgId: orgIdField,
    },
    handler: async ({ campaignId, keywordIds, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/campaigns/${campaignId}/negativekeywords/delete/bulk`,
        body: keywordIds,
        orgId,
      });
      return unwrap(res);
    },
  },
];
