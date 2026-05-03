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
      "Fetches app metadata. Per Apple: returns a MediaDetail (appName, artistName, availableStorefronts, deviceClasses, iconPictureUrl, isPreOrder, primaryGenre, secondaryGenre, primaryLanguage).",
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
      "Fetches the localized default product page for an app. Returns MediaLocaleDetail. Set expand=true to include detailed app asset details per device.",
    inputShape: {
      adamId: z.number().int(),
      expand: z.boolean().optional(),
      orgId: orgIdField,
    },
    handler: async ({ adamId, expand, orgId }, { client }) => {
      const res = await client.request({
        path: `/apps/${adamId}/locale-details`,
        query: { expand },
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "apps_eligibilities_find",
    description:
      "Determines whether an app is eligible to promote in a campaign. Per Apple: filter via Selector by countryOrRegion, DeviceClass, AgeCriteria, or SupplySource.",
    inputShape: {
      adamId: z
        .union([z.string(), z.number().int()])
        .describe("Per Apple's doc this path parameter is typed as string."),
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
      "Finds app asset metadata associated with an adamId. Per Apple: supports both default and custom product page ads.",
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
      "Fetches the complete list of supported app preview device-size mappings.",
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
      "Fetches supported product page languages and language codes for countries or regions. Per Apple: pass `countriesOrRegions` as comma-separated ISO alpha-2 codes to filter.",
    inputShape: {
      countriesOrRegions: z
        .string()
        .optional()
        .describe("Comma-separated ISO alpha-2 country codes."),
      orgId: orgIdField,
    },
    handler: async ({ countriesOrRegions, orgId }, { client }) => {
      const res = await client.request({
        path: "/countries-or-regions",
        query: { countriesOrRegions },
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "cpp_list",
    description:
      "Fetches metadata for all your custom product pages for an app. Per Apple: the response id is your productPageId, used by creatives_create to obtain a creativeId. Filter via `name` or `states`.",
    inputShape: {
      adamId: z.number().int(),
      name: z.string().optional().describe("Filter by name."),
      states: z
        .string()
        .optional()
        .describe("Filter by states (e.g. visible / hidden)."),
      orgId: orgIdField,
    },
    handler: async ({ adamId, name, states, orgId }, { client }) => {
      const res = await client.request({
        path: `/apps/${adamId}/product-pages`,
        query: { name, states },
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "cpp_get",
    description:
      "Fetches metadata for a specific custom product page. Use the returned productPageId with creatives_create to obtain a creativeId.",
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
      "Fetches localized custom-product-page metadata by identifier. Per Apple: filter by deviceClasses, languageCodes (e.g. `en-US`, comma-separated allowed), or languages (ISO alpha-2). Set expand=true for detailed asset values.",
    inputShape: {
      adamId: z.number().int(),
      productPageId: z.string(),
      deviceClasses: z.string().optional(),
      languageCodes: z.string().optional(),
      languages: z.string().optional(),
      expand: z.boolean().optional(),
      orgId: orgIdField,
    },
    handler: async (
      { adamId, productPageId, deviceClasses, languageCodes, languages, expand, orgId },
      { client },
    ) => {
      const res = await client.request({
        path: `/apps/${adamId}/product-pages/${productPageId}/locale-details`,
        query: { deviceClasses, languageCodes, languages, expand },
        orgId,
      });
      return unwrap(res);
    },
  },
];
