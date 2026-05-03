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
      "Fetches ad creative rejection reasons for default or custom product page ads, filtered via Selector. See the ProductPageReason object for the rejection reason code enumerations and supported Selector condition operators.",
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
    description:
      "Fetches one ad creative rejection reason by productPageReasonId — the id field returned in a ProductPageReason object.",
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
