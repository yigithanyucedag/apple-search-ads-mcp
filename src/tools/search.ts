import { z } from "zod";
import { limitField, offsetField, orgIdField, unwrap, type ToolDef } from "./_shared.js";

const geoEntityEnum = z.enum(["Country", "AdminArea", "Locality"]);

export const searchTools: ToolDef[] = [
  {
    name: "search_apps",
    description:
      "Searches for iOS apps to promote in a campaign. Per Apple: prefix-matching algorithm requiring a minimum of three characters; spaces are allowed in the pattern; quoted search strings should be HTML-encoded. Returns adamId, which is consumed by campaigns_create and by AppDownloaderCriteria in TargetingDimensions.",
    inputShape: {
      query: z.string().min(3),
      returnOwnedApps: z
        .boolean()
        .optional()
        .describe("Restrict results to apps belonging to your organization."),
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
      "Fetches a list of geolocations for targeting. Per Apple: campaigns that serve multiple countries or regions cannot use geotargeting. The query parameter uses prefix-matching with a minimum of three characters. Specify the entity (country, AdminArea, or Locality) and apply results to ad groups via CountryCriteria, AdminAreaCriteria, and LocalityCriteria in TargetingDimensions.",
    inputShape: {
      query: z.string().min(3).optional(),
      entity: geoEntityEnum,
      countrycode: z
        .string()
        .length(2)
        .optional()
        .describe(
          "ISO alpha-2. Lowercase parameter name on purpose — Apple's documentation uses `countrycode`.",
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
      "Gets geolocation details using one or more geo identifiers. Per Apple: pass each geo id in the request payload to receive the corresponding displayName and geolocation back.",
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
      limit: limitField,
      offset: offsetField,
      orgId: orgIdField,
    },
    handler: async ({ requests, limit, offset, orgId }, { client }) => {
      const res = await client.request({
        method: "POST",
        path: "/search/geo",
        query: { limit, offset },
        body: requests,
        orgId,
      });
      return unwrap(res);
    },
  },
];
