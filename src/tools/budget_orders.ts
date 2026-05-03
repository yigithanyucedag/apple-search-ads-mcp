import { z } from "zod";
import {
  compact,
  limitField,
  offsetField,
  orgIdField,
  unwrap,
  type ToolDef,
} from "./_shared.js";

const moneyField = z.object({
  amount: z.string(),
  currency: z.string().length(3),
});

const supplySourceEnum = z.enum([
  "APPSTORE_SEARCH_RESULTS",
  "APPSTORE_SEARCH_TAB",
  "APPSTORE_TODAY_TAB",
  "APPSTORE_PRODUCT_PAGES_BROWSE",
]);

const budgetOrderShape = {
  name: z.string(),
  budget: moneyField,
  startDate: z.string().describe("YYYY-MM-DD."),
  endDate: z.string().describe("YYYY-MM-DD."),
  primaryBuyerEmail: z.string().email().optional(),
  primaryBuyerName: z.string().optional(),
  billingEmail: z.string().email().optional(),
  clientName: z.string().optional(),
  orderNumber: z.string().optional(),
  supplySources: z.array(supplySourceEnum).optional(),
} as const;

export const budgetOrderTools: ToolDef[] = [
  {
    name: "budget_orders_create",
    description:
      "Create a budget order (LOC accounts only). Wraps Apple's `{bo, orgIds}` envelope.",
    inputShape: {
      ...budgetOrderShape,
      orgIds: z
        .array(z.number().int())
        .min(1)
        .max(1)
        .describe("Apple currently supports exactly one orgId per budget order."),
      orgId: orgIdField,
    },
    handler: async (input, { client }) => {
      const { orgId, orgIds, ...bo } = input;
      const res = await client.request({
        method: "POST",
        path: "/budgetorders",
        body: { bo: compact(bo), orgIds },
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "budget_orders_get",
    description: "Fetch a single budget order by ID.",
    inputShape: {
      budgetOrderId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ budgetOrderId, orgId }, { client }) => {
      const res = await client.request({
        path: `/budgetorders/${budgetOrderId}`,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "budget_orders_list",
    description: "List all budget orders in the org (paginated).",
    inputShape: {
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async ({ limit, offset, orgId }, { client }) => {
      const res = await client.request({
        path: "/budgetorders",
        query: { limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "budget_orders_update",
    description:
      "Update a budget order. Most fields are editable post-creation; status is read-only. " +
      "v5 has no delete endpoint for budget orders.",
    inputShape: {
      budgetOrderId: z.number().int(),
      bo: z
        .object({
          name: z.string().optional(),
          budget: moneyField.optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          primaryBuyerEmail: z.string().email().optional(),
          primaryBuyerName: z.string().optional(),
          billingEmail: z.string().email().optional(),
          clientName: z.string().optional(),
          orderNumber: z.string().optional(),
          supplySources: z.array(supplySourceEnum).optional(),
        })
        .passthrough(),
      orgIds: z.array(z.number().int()).min(1).max(1).optional(),
      orgId: orgIdField,
    },
    handler: async ({ budgetOrderId, bo, orgIds, orgId }, { client }) => {
      const res = await client.request({
        method: "PUT",
        path: `/budgetorders/${budgetOrderId}`,
        body: compact({ bo, orgIds }),
        orgId,
      });
      return unwrap(res);
    },
  },
];
