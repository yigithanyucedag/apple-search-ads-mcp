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
  startDate: z.string(),
  endDate: z.string(),
  primaryBuyerEmail: z.string().email().optional(),
  primaryBuyerName: z.string().optional(),
  billingEmail: z.string().email().optional(),
  clientName: z.string().optional(),
  orderNumber: z.string().optional(),
  supplySources: z
    .array(supplySourceEnum)
    .optional()
    .describe(
      "Optional as of API v5.3 — responses always include all possible values regardless.",
    ),
} as const;

export const budgetOrderTools: ToolDef[] = [
  {
    name: "budget_orders_create",
    description:
      "Creates a budget order in the context of the org. Per Apple: the response id is your budget order id, which you then use to update the budget order or to fetch assigned, completed, and canceled budget orders. As of API v5.3 supplySources is optional.",
    inputShape: {
      ...budgetOrderShape,
      orgIds: z
        .array(z.number().int())
        .min(1)
        .max(1)
        .describe("Currently exactly one orgId is supported."),
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
    description:
      "Fetches a specific budget order by id. Per Apple: returns assigned, completed, or canceled budget orders for the organization or campaign group. You can only fetch budget orders via this endpoint or budget_orders_list — invoicing cannot be set through the API.",
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
    description:
      "Fetches all assigned budget orders for the organization. Per Apple: returns completed and canceled orders too. Budget orders also return when calling campaigns_create or campaigns_update. Invoicing cannot be set through the API.",
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
      "Updates an existing budget order. Per Apple: pass the id from budget_orders_create as the resource. v5 has no delete endpoint for budget orders.",
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
