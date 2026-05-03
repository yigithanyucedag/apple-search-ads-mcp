import { z } from "zod";
import {
  orgIdField,
  selectorSchema,
  unwrap,
  type ToolDef,
} from "./_shared.js";

export const productPageReasonTools: ToolDef[] = [
  {
    name: "product_page_reasons_find",
    description:
      "Find ad-creative rejection reasons (filterable by adamId, productPageId, " +
      "assetGenId, countryOrRegion, languageCode, supplySource, reasonLevel). " +
      "Use this to audit why a creative was rejected by Apple's review team.",
    inputShape: {
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: "/product-page-reasons/find",
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },
  {
    name: "product_page_reasons_get",
    description: "Fetch a single rejection reason by ID.",
    inputShape: {
      productPageReasonId: z.string(),
      orgId: orgIdField,
    },
    handler: async ({ productPageReasonId, orgId }, { client }) => {
      const res = await client.request({
        path: `/product-page-reasons/${productPageReasonId}`,
        orgId,
      });
      return unwrap(res);
    },
  },
];
