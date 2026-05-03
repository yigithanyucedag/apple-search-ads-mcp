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
    text: z.string().min(1).describe("The keyword phrase."),
    matchType: z
      .enum(["BROAD", "EXACT"])
      .describe(
        "BROAD matches close variants and synonyms; EXACT matches only the literal phrase.",
      ),
    bidAmount: moneyField.describe(
      "Per-keyword bid. Required unless an ad-group default bid covers it.",
    ),
    status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  })
  .passthrough();

const targetingKeywordUpdateSchema = z
  .object({
    id: z.number().int().describe("Keyword ID returned from a prior create/list call."),
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
      "Bulk-create targeting (positive) keywords on an ad group. Pass up to 1000 per call.",
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
    description: "Fetch a single targeting keyword by ID.",
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
    description: "List targeting keywords on an ad group (paginated).",
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
      "Find targeting keywords across all ad groups in a campaign with a selector. " +
      "Apple does not expose a per-ad-group find — filter by adGroupId in the selector if needed.",
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
      "Bulk-update targeting keywords (status, bid, text, matchType). Each entry must include id.",
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
    description: "Bulk-delete targeting keywords by ID.",
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
      "Delete a single targeting keyword by ID (uses Apple's REST DELETE variant).",
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
    description: "Bulk-create negative keywords on an ad group.",
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
    description: "Fetch a single ad-group-level negative keyword by ID.",
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
    description: "List ad-group-level negative keywords (paginated).",
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
      "Find ad-group-level negative keywords across all ad groups in a campaign with a selector.",
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
    description: "Bulk-update ad-group-level negative keywords. Each entry must include id.",
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
    description: "Bulk-delete ad-group-level negative keywords by ID.",
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
    description: "Bulk-create campaign-level negative keywords (apply across all ad groups).",
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
    description: "Fetch a single campaign-level negative keyword by ID.",
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
    description: "List campaign-level negative keywords (paginated).",
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
      "Find campaign-level negative keywords within a single campaign with a selector.",
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
    description: "Bulk-update campaign-level negative keywords.",
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
    description: "Bulk-delete campaign-level negative keywords by ID.",
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
