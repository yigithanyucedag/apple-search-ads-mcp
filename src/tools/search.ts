import { z } from "zod";
import { limitField, offsetField, orgIdField, unwrap, type ToolDef } from "./_shared.js";

const geoEntityEnum = z.enum(["Country", "AdminArea", "Locality"]).describe(
  "v5 only supports Country / AdminArea / Locality. Postal-code targeting is not in v5.",
);

export const searchTools: ToolDef[] = [
  {
    name: "search_apps",
    description:
      "Search the App Store for apps to target / advertise. Returns adamId, name, " +
      "developerName, and country availability. You need adamId to create campaigns.",
    inputShape: {
      query: z.string().min(1).describe("App name or developer keyword."),
      returnOwnedApps: z
        .boolean()
        .optional()
        .describe("If true, restricts to apps owned by your team."),
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async ({ query, returnOwnedApps, limit, offset, orgId }, { client }) => {
      const res = await client.request({
        path: "/search/apps",
        query: {
          query,
          returnOwnedApps: returnOwnedApps ? "true" : undefined,
          limit,
          offset,
        },
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "search_geo",
    description:
      "Search geo entities by name (Country / AdminArea / Locality). Pass `countrycode` (lowercase, " +
      "Apple's quirk) to scope an admin-area or locality search to one country.",
    inputShape: {
      query: z.string().min(1),
      entity: geoEntityEnum,
      countrycode: z
        .string()
        .length(2)
        .optional()
        .describe(
          "ISO 3166-1 alpha-2. Lowercase parameter name on purpose — Apple is case-sensitive here.",
        ),
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async (
      { query, entity, countrycode, limit, offset, orgId },
      { client },
    ) => {
      const res = await client.request({
        path: "/search/geo",
        query: { query, entity, countrycode, limit, offset },
        orgId,
      });
      return unwrap(res);
    },
  },

  {
    name: "geo_lookup",
    description:
      "Resolve geos by raw IDs. Each request item is { id: 'CountryCode|adminArea|locality', " +
      "entity: 'Country|AdminArea|Locality' }. Useful when a report returns geo IDs you want named.",
    inputShape: {
      requests: z
        .array(
          z.object({
            id: z.string(),
            entity: geoEntityEnum,
          }),
        )
        .min(1)
        .max(100),
      orgId: orgIdField,
    },
    handler: async ({ requests, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: "/search/geo",
        body: requests,
        orgId,
      });
      return unwrap(res);
    },
  },
];
