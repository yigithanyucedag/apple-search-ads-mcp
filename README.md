# apple-search-ads-mcp

[![CI](https://github.com/yigithanyucedag/apple-search-ads-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/yigithanyucedag/apple-search-ads-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)](package.json)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)

A Model Context Protocol (MCP) server that wraps the **full Apple Search Ads (now Apple Ads) Campaign Management API v5**. 74 typed tools, 1:1 mapping to every documented v5 endpoint — campaigns, ad groups, ads, creatives, custom product pages, keywords, negative keywords, reports, impression-share reports, budget orders, ACLs, geo/app search, app metadata, rejection-reason audits — plus a raw passthrough for any future endpoints.

> **API lifecycle:** Apple Ads (Search Ads) v5 is the current production API. v5 sunsets January 26, 2027 in favour of the new "Apple Ads Platform API" arriving Summer 2026. This server targets v5.0 → v5.5.

## Quick install

```bash
git clone https://github.com/yigithanyucedag/apple-search-ads-mcp.git
cd apple-search-ads-mcp
npm install
npm run build
```

Then register with Claude Code in one line:

```bash
claude mcp add apple-search-ads --scope user \
  -e ASA_CLIENT_ID=SEARCHADS.xxxx \
  -e ASA_TEAM_ID=SEARCHADS.xxxx \
  -e ASA_KEY_ID=xxxx \
  -e ASA_PRIVATE_KEY_PATH=/absolute/path/to/asa-private.p8 \
  -e ASA_ORG_ID=1234567 \
  -- node $(pwd)/dist/index.js
```

## Setup

### 1. Get API credentials

In the [Apple Ads UI](https://app-ads.apple.com), go to **Account Settings → API → Generate API Client**. You upload your **public** key here; Apple keeps the public half and gives you the **Client ID**, **Team ID**, and **Key ID**.

Generate the key pair locally — **make sure it's PKCS#8**, not the legacy EC format:

```bash
# CORRECT — produces PKCS#8 (-----BEGIN PRIVATE KEY-----)
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out asa-private.p8
openssl ec -in asa-private.p8 -pubout -out asa-public.pem

# WRONG — produces traditional EC (-----BEGIN EC PRIVATE KEY-----), jose can't load it.
# If you already did this, convert with:
#   openssl pkcs8 -topk8 -nocrypt -in asa-private.p8 -out asa-private-pkcs8.p8
```

Paste `asa-public.pem`'s contents into the textarea, hit **Generate API Client**, copy the three IDs.

### 2. Install

```bash
npm install
npm run build
```

### 3. Configure

Copy `.env.example` to `.env` and fill it in, or pass env vars through your MCP client.

```bash
ASA_CLIENT_ID=SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ASA_TEAM_ID=SEARCHADS.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ASA_KEY_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ASA_PRIVATE_KEY_PATH=/absolute/path/to/private-key.p8
ASA_ORG_ID=1234567   # optional default; can be overridden per call
```

`ASA_PRIVATE_KEY` (PEM contents inline, with `\n` escapes if injected via JSON) is supported as an alternative to `ASA_PRIVATE_KEY_PATH`.

### 4. Wire into your MCP client

```json
{
  "mcpServers": {
    "apple-search-ads": {
      "command": "node",
      "args": ["/absolute/path/to/apple-search-ads-mcp/dist/index.js"],
      "env": {
        "ASA_CLIENT_ID": "SEARCHADS.xxxx...",
        "ASA_TEAM_ID": "SEARCHADS.xxxx...",
        "ASA_KEY_ID": "xxxx...",
        "ASA_PRIVATE_KEY_PATH": "/absolute/path/to/private-key.p8",
        "ASA_ORG_ID": "1234567"
      }
    }
  }
}
```

## Authentication

The server handles OAuth 2.0 client-credentials flow with an ES256 JWT client assertion:

1. Sign a JWT with your `.p8` private key (header: `kid`=Key ID, `alg`=ES256; payload: `iss`=Team ID, `sub`=Client ID, `aud`=`https://appleid.apple.com`).
2. POST it to `https://appleid.apple.com/auth/oauth2/token` with `grant_type=client_credentials` and `scope=searchadsorg`.
3. Use the returned 1-hour access token with `Authorization: Bearer …` and `X-AP-Context: orgId=…` on every API call.

The token is cached in memory until ~30 s before expiry, so you sign one assertion and exchange one token per hour. On `401` the server force-refreshes and retries once. On `429`/`5xx` it backs off (honouring `Retry-After`) up to 3 times.

## Tool inventory (74 tools)

### Account & access (2)
`org_acls`, `me_user` — call without an org context to discover what your token can do.

### Discovery (3)
`search_apps`, `search_geo`, `geo_lookup`

### App metadata (6)
`apps_get`, `apps_locale_details`, `apps_eligibilities_find`, `apps_assets_find`, `creative_app_preview_devices`, `countries_or_regions_list`

### Custom Product Pages (3)
`cpp_list`, `cpp_get`, `cpp_locale_details`

### Campaigns (6)
`campaigns_create`, `campaigns_get`, `campaigns_list`, `campaigns_find`, `campaigns_update`, `campaigns_delete`

### Ad groups (7)
`adgroups_create`, `adgroups_get`, `adgroups_list`, `adgroups_find_in_campaign`, `adgroups_find_org_wide`, `adgroups_update`, `adgroups_delete`

### Creatives (4)
`creatives_create`, `creatives_list`, `creatives_get`, `creatives_find` — creatives wrap a Custom Product Page, Default Product Page, or Creative Set reference. Ads bind to creatives via `creativeId`.

### Ads (7)
`ads_create`, `ads_get`, `ads_list`, `ads_find_in_campaign`, `ads_find_org_wide`, `ads_update`, `ads_delete`

### Targeting keywords (7)
`targeting_keywords_create`, `targeting_keywords_get`, `targeting_keywords_list`, `targeting_keywords_find`, `targeting_keywords_update`, `targeting_keywords_delete` (bulk), `targeting_keywords_delete_single`

### Negative keywords — ad-group scope (6)
`adgroup_negative_keywords_create`, `adgroup_negative_keywords_get`, `adgroup_negative_keywords_list`, `adgroup_negative_keywords_find`, `adgroup_negative_keywords_update`, `adgroup_negative_keywords_delete`

### Negative keywords — campaign scope (6)
`campaign_negative_keywords_create`, `campaign_negative_keywords_get`, `campaign_negative_keywords_list`, `campaign_negative_keywords_find`, `campaign_negative_keywords_update`, `campaign_negative_keywords_delete`

### Reports (7)
| Tool | Endpoint |
| --- | --- |
| `reports_campaigns` | `POST /reports/campaigns` |
| `reports_adgroups` | `POST /reports/campaigns/{id}/adgroups` |
| `reports_keywords_in_campaign` | `POST /reports/campaigns/{id}/keywords` |
| `reports_keywords_in_adgroup` | `POST /reports/campaigns/{id}/adgroups/{id}/keywords` |
| `reports_search_terms_in_campaign` | `POST /reports/campaigns/{id}/searchterms` |
| `reports_search_terms_in_adgroup` | `POST /reports/campaigns/{id}/adgroups/{id}/searchterms` |
| `reports_ads_in_campaign` | `POST /reports/campaigns/{id}/ads` |

All accept `startTime`, `endTime`, optional `granularity` (HOURLY/DAILY/WEEKLY/MONTHLY), optional `groupBy` (adminArea / ageRange / countryCode / countryOrRegion / deviceClass / gender / locality), `selector`, `returnRowTotals`, `returnGrandTotals`, `returnRecordsWithNoMetrics`, `timeZone` (UTC | ORTZ).

### Impression Share Reports (3) — async
`custom_reports_create` → returns reportId. Poll with `custom_reports_get` until `state=COMPLETED`. List with `custom_reports_list`.

### Budget Orders (4) — LOC accounts only
`budget_orders_create`, `budget_orders_get`, `budget_orders_list`, `budget_orders_update`. v5 has no delete for budget orders.

### Rejection-reason audit (2)
`product_page_reasons_find`, `product_page_reasons_get` — read-only inspection of why Apple's reviewers rejected creatives.

### Escape hatch (1)
`apple_search_ads_request` — call any path with any method. Auth and org context are still handled for you.

## Selectors

`*_find` tools accept Apple's selector grammar:

```jsonc
{
  "conditions": [
    { "field": "status", "operator": "EQUALS", "values": ["ENABLED"] },
    { "field": "countriesOrRegions", "operator": "CONTAINS_ANY", "values": ["US", "GB"] }
  ],
  "fields": ["id", "name", "status"],
  "orderBy": [{ "field": "name", "sortOrder": "ASCENDING" }],
  "pagination": { "limit": 100, "offset": 0 }
}
```

Operators: `EQUALS`, `NOT_EQUALS`, `CONTAINS`, `STARTS_WITH`, `ENDS_WITH`, `GREATER_THAN`, `LESS_THAN`, `IN`, `NOT_IN`, `CONTAINS_ALL`, `CONTAINS_ANY`, `BETWEEN`. `values` is always an array.

## End-to-end example

A workflow you can drive entirely through Claude:

1. `org_acls` → pick the `orgId`.
2. `search_apps` for your app → grab the `adamId`.
3. `campaigns_create` with that adamId, daily budget, US targeting, `adChannelType=SEARCH`, `supplySources=["APPSTORE_SEARCH_RESULTS"]`, `billingEvent=TAPS`.
4. `adgroups_create` inside the campaign with `defaultBidAmount={amount:"1.00",currency:"USD"}` and `pricingModel=CPC`.
5. `targeting_keywords_create` with a batch of `{text, matchType, bidAmount}` rows.
6. `cpp_list` → pick a productPageId → `creatives_create` with `type=CUSTOM_PRODUCT_PAGE` to mint a creativeId → `ads_create` to bind it to the ad group.
7. Wait a few days. `reports_campaigns` for top-line, then `reports_search_terms_in_campaign` to harvest new keywords / negatives.
8. `custom_reports_create` for impression-share / share-of-voice on your top searches.

## Known surface notes (v5 quirks)

- **No legacy creative-set CRUD.** Apple removed it in v5; create a `creatives` row instead and reference it from `ads.creativeId`.
- **No app categories endpoint.** Use `apps_get` and read `primaryGenre` / `secondaryGenre`.
- **No postal-code geo targeting.** Geo entities in v5 are Country / AdminArea / Locality only.
- **No org-wide find for keywords or ad-group-scoped keyword find.** Apple scopes targeting-keyword find at the campaign level (`/campaigns/{id}/adgroups/targetingkeywords/find`) and rolls up across ad groups; filter by `adGroupId` in the selector to narrow.
- **No DELETE on budget orders.** Update them, don't delete them.
- **Audiences, forecasting, conversion events** are NOT in v5 — those live in separate Apple APIs (AdServices Attribution etc.).

## Local development

```bash
npm run dev        # tsc --watch
npm run typecheck  # one-shot type check
npm run build      # compile to dist/
```

Use `apple_search_ads_request` to debug any endpoint directly — it returns the raw envelope so you can see the exact response shape Apple returned.
