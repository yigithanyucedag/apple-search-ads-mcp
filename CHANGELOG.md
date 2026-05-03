# Changelog

All notable changes to this project will be documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-05-03

Stable release. The tool surface, names, and shapes are now considered the public API and will follow semver going forward.

### Added
- `glama.json` (maintainers manifest) for the Glama MCP directory.
- `Dockerfile` (multi-stage, node:20-alpine, non-root) — production-deployable container.
- Lazy credential loading: server boots and responds to MCP introspection (`initialize` + `tools/list`) without env vars set, so directory listings and image scanners can probe it. Real tool calls still validate credentials.

### Notes
- No breaking changes vs `0.1.0`. The bump to `1.0.0` reflects production readiness — npm published, Glama listed (verified author, MIT license), Docker image tested, and 100 % v5 endpoint coverage confirmed against Apple's published docs.

## [0.1.0] — 2026-05-03

Initial release. Full coverage of the Apple Ads (formerly Apple Search Ads) Campaign Management API v5 (v5.0 → v5.5).

### Added
- ES256 JWT client-assertion auth + 1-hour access-token cache, automatic re-auth on 401, exponential backoff on 429/5xx honouring `Retry-After`.
- 73 typed MCP tools mapping 1:1 to Apple's documented v5 REST surface, plus 1 raw passthrough — 74 tools total. Coverage by family:
  - Account & access (2): `org_acls`, `me_user`
  - Discovery (3): `search_apps`, `search_geo`, `geo_lookup`
  - App metadata (6): `apps_get`, `apps_locale_details`, `apps_eligibilities_find`, `apps_assets_find`, `creative_app_preview_devices`, `countries_or_regions_list`
  - Custom Product Pages (3): `cpp_list`, `cpp_get`, `cpp_locale_details`
  - Campaigns (6) — including v5.5 `biddingStrategy` / `targetCpa` (MAX_CONVERSIONS)
  - Ad groups (7) — including `biddingStrategy`
  - Creatives (4)
  - Ads (7)
  - Targeting keywords (7)
  - Negative keywords ad-group scope (6)
  - Negative keywords campaign scope (6)
  - Reports (7) — including v5.4 preorder metrics and v5.0 view-through metrics via `passthrough()`
  - Custom (Impression Share) reports (3) — async create / poll / list
  - Budget orders (4) — create/get/list/update (v5 has no delete)
  - Rejection reasons (2)
  - Raw passthrough (1)
- Per-call `orgId` override on every tool — switch between accessible orgs without restarting.
- Selector grammar (`conditions` / `fields` / `orderBy` / `pagination`) for every `*_find` tool.
- Pagination helper on the underlying client.
