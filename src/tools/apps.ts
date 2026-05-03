import { z } from "zod";
import {
  orgIdField,
  selectorSchema,
  unwrap,
  type ToolDef,
} from "./_shared.js";

export const appTools: ToolDef[] = [
  {
    name: "apps_get",
    description:
      "Fetch App Store metadata for an app: appName, developerName, primaryGenre, " +
      "secondaryGenre, iconPictureUrl, availableStorefronts, deviceClasses, etc.",
    inputShape: {
      adamId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ adamId, orgId }, { client }) => {
      const res = await client.request({
        path: `/apps/${adamId}`,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "apps_locale_details",
    description:
      "Get localized default product-page details for an app (subtitle, short " +
      "description, screenshots, app preview) per locale.",
    inputShape: {
      adamId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ adamId, orgId }, { client }) => {
      const res = await client.request({
        path: `/apps/${adamId}/locale-details`,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "apps_eligibilities_find",
    description:
      "Find app-eligibility records by selector (filterable by supplySource, " +
      "countryOrRegion, deviceClass, state).",
    inputShape: {
      adamId: z.number().int(),
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ adamId, selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/apps/${adamId}/eligibilities/find`,
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "apps_assets_find",
    description:
      "Find App Store screenshots / app-preview assets for an app — returns " +
      "assetGenIds you can use to author creatives or audit rejected assets.",
    inputShape: {
      adamId: z.number().int(),
      selector: selectorSchema,
      orgId: orgIdField,
    },
    handler: async ({ adamId, selector, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: `/apps/${adamId}/assets/find`,
        body: selector,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "creative_app_preview_devices",
    description:
      "List supported app-preview device-size mappings (e.g. IPHONE_61, IPAD_129). " +
      "Used when authoring creatives or interpreting screenshot/preview metadata.",
    inputShape: {
      orgId: orgIdField,
    },
    handler: async ({ orgId }, { client }) => {
      const res = await client.request({
        path: "/creativeappmappings/devices",
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "countries_or_regions_list",
    description:
      "List supported countries / regions with their default and supported product-page languages.",
    inputShape: {
      orgId: orgIdField,
    },
    handler: async ({ orgId }, { client }) => {
      const res = await client.request({
        path: "/countries-or-regions",
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "cpp_list",
    description: "List Custom Product Pages for an app.",
    inputShape: {
      adamId: z.number().int(),
      orgId: orgIdField,
    },
    handler: async ({ adamId, orgId }, { client }) => {
      const res = await client.request({
        path: `/apps/${adamId}/product-pages`,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "cpp_get",
    description: "Fetch a single Custom Product Page by ID.",
    inputShape: {
      adamId: z.number().int(),
      productPageId: z.string(),
      orgId: orgIdField,
    },
    handler: async ({ adamId, productPageId, orgId }, { client }) => {
      const res = await client.request({
        path: `/apps/${adamId}/product-pages/${productPageId}`,
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "cpp_locale_details",
    description:
      "List the locales available for a Custom Product Page (with localized assets per locale).",
    inputShape: {
      adamId: z.number().int(),
      productPageId: z.string(),
      orgId: orgIdField,
    },
    handler: async ({ adamId, productPageId, orgId }, { client }) => {
      const res = await client.request({
        path: `/apps/${adamId}/product-pages/${productPageId}/locale-details`,
        orgId,
      });
      return unwrap(res);
    },
  },
];
