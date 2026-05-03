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
      "Create a creative (a reference to a default product page, custom product page, " +
      "or creative set). Ads bind to creatives via creativeId.",
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
    description: "List all creatives in the org (paginated).",
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
    description: "Fetch a single creative by ID.",
    inputShape: {
      creativeId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ creativeId, orgId }, { client }) => {
      const res = await client.request({
        path: `/creatives/${creativeId}`,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "creatives_find",
    description: "Find creatives across the org with a selector.",
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
