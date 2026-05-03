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

const creativeBaseShape = {
  name: z.string().min(1),
  adamId: z.number().int(),
  type: creativeTypeEnum,
  productPageId: z
    .string()
    .optional()
    .describe("Required when type=CUSTOM_PRODUCT_PAGE."),
  extra: z.record(z.unknown()).optional(),
} as const;

export const creativeTools: ToolDef[] = [
  {
    name: "creatives_create",
    description:
      "Creates a Creative object within an organization using a productPageId. The returned creativeId is consumed by ads_create.",
    inputShape: {
      ...creativeBaseShape,
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const { extra, orgId, ...rest } = input;
      const body = compact({ ...rest, ...(extra ?? {}) });
      const res = await client.request({
        method: "POST",
        path: "/creatives",
        body,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "creatives_list",
    description:
      "Fetches details of all assigned Creative objects for the organization. Paginated.",
    inputShape: {
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async ({ limit, offset, orgId }, { client }) => {
      const res = await client.request({
        path: "/creatives",
        query: { limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "creatives_get",
    description:
      "Fetches details of a Creative by creativeId. Set includeDeletedCreativeSetAssets=true to include deleted assets (excluded by default).",
    inputShape: {
      creativeId: z.number().int(),
      includeDeletedCreativeSetAssets: z.boolean().optional(),
      orgId: orgIdField,
    },
    handler: async (
      { creativeId, includeDeletedCreativeSetAssets, orgId },
      { client },
    ) => {
      const res = await client.request({
        path: `/creatives/${creativeId}`,
        query: { includeDeletedCreativeSetAssets },
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "creatives_find",
    description:
      "Finds creatives using a Selector Condition. Per Apple: if you don't specify selector conditions, all creatives return; values are case-sensitive strings; orderBy supports the id and name fields.",
    inputShape: {
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: "/creatives/find",
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },
];
