# Changelog

All notable changes to InfernoCMS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the project is pre-1.0, breaking changes may occur in minor releases (`0.x.0`). Patch releases (`0.1.x`) will be backwards-compatible.

## [Unreleased]

## [0.1.0] — 2026-05-02

First public release. Ships the headless CMS engine — schema, database, REST API — as a single npm package.

### Added

#### Schema engine
- 17 field types: `text`, `textarea`, `number`, `boolean`, `select`, `datetime`, `date`, `json`, `relation`, `slug`, `image`, `file`, `richtext`, `blocks`, `link`, `group`, `array`
- Shorthand syntax (`'text!'`, `'rel:authors[]'`, `'slug:title'`) and verbose `field.*` builders
- Auto type generation to `.infernocms/types.ts`

#### Database
- PGlite driver for zero-config local development
- PostgreSQL driver for production (auto-detected via `DATABASE_URL`)
- Auto-generated DDL with safe production migrations and force-resync in dev
- Many-to-many relations via auto-generated junction tables

#### REST API
- Auto-generated CRUD endpoints per collection (`GET`/`POST`/`PUT`/`PATCH`/`DELETE`)
- Schema introspection (`GET /api/_schema`)
- File upload (`POST /api/_upload`)
- Health check (`GET /api/_health`)
- Query features: pagination, sorting, filtering, field selection (`?fields=`), depth-resolved relations (`?depth=`), full-text search
- Standardized JSON response envelope

#### Lifecycle and integrations
- Hooks: `beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete` (async-aware)
- Per-collection access control (`read`, `create`, `update`, `delete` rules)
- Outbound webhooks on CRUD events with retry
- Optional JWT/cookie auth middleware

#### Storage
- Local file storage driver
- S3-compatible storage driver (AWS S3, Cloudflare R2)

#### CLI
- `infernocms dev` — starts API server, auto-syncs schema, regenerates types, hot-reloads on config change, spawns admin preview when available

### Known limitations

- **Admin UI is preview-only.** The admin (`packages/admin`) is functional in the monorepo but not yet published to npm. External users who `npm install infernocms` get the API only. Full admin packaging targets `0.2.0`.
- **No ESLint config in admin.** The `next.config.js` no longer suppresses TypeScript errors — admin builds with `strict: true` validation, clean. ESLint setup is deferred to `0.2.0`.
- **No migration history.** Dev mode force-resyncs the schema; production mode applies safe migrations but doesn't yet keep a versioned migration log.

### Roadmap to 0.2.0

- Publish `@infernocms/admin` as a separate npm package (or bundle a built admin into core)
- Add ESLint config to admin (TypeScript already strict-clean)
- Add admin tests
- Surface server validation errors into admin form fields
- Migration history with rollback

[Unreleased]: https://github.com/ochoadan/infernocms/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ochoadan/infernocms/releases/tag/v0.1.0
