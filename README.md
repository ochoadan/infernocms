# InfernoCMS

A headless CMS that gets out of your way — define content in code, get a REST API instantly.

> **0.1.0** ships the API + schema engine. InfernoCMS is headless — you operate it through the REST API, the CLI, and [`@infernocms/next`](packages/next). See [Status](#status) below.

```bash
npm install infernocms
```

```ts
// content.config.ts
import { defineConfig, field } from 'infernocms';

export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: field.text({ required: true }),
        slug: field.slug({ from: 'title' }),
        body: field.richtext(),
        author: field.relation({ collection: 'authors' }),
        status: field.select({ options: ['draft', 'published'], default: 'draft' }),
      },
    },
    authors: {
      fields: {
        name: field.text({ required: true }),
        bio: field.textarea(),
      },
    },
  },
});
```

```bash
npx infernocms dev
```

REST API at `http://localhost:4000/api/posts` — full schema introspection at `/api/_schema`.

## What you get

- **REST API** — auto-generated CRUD endpoints, pagination, sorting, filtering, field selection, depth-resolved relations
- **Schema engine** — 17 field types (text, richtext, image/file, relation, slug, blocks, array, group, link, …) with shorthand + verbose syntax
- **Database** — PGlite for dev (zero config), PostgreSQL for prod (`DATABASE_URL`), same code path
- **Storage** — local files or S3/R2 (any S3-compatible provider)
- **Hooks** — `before/afterCreate`, `before/afterUpdate`, `before/afterDelete`, async-aware
- **Webhooks** — outbound HTTP delivery on CRUD events with retry
- **Access control** — per-collection read/create/update/delete rules
- **Type generation** — auto-emits `.infernocms/types.ts` from your config
- **Token-first auth** — bearer tokens with `read` / `write` / `admin` scopes, hashed at rest, revocable

## Auth

Every request authenticates with `Authorization: Bearer <token>`. Tokens live in `_infernocms_tokens` with three scopes (`read` / `write` / `admin`), are hashed at rest, and are revocable.

On first start, an admin token is generated and printed to stdout (and appended to `.env` if present). Hosting platforms can pre-set it via `INFERNOCMS_BOOTSTRAP_TOKEN`.

```bash
# Verify your token
curl http://localhost:4000/api/_auth/me \
  -H "Authorization: Bearer $TOKEN"
# → { "data": { "id": "...", "name": "bootstrap", "scope": "admin" } }

# Mint a write-scoped token for a content pipeline
curl -X POST http://localhost:4000/api/_tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"content-pipeline","scope":"write"}'
# → { "data": { "id": "...", "plaintext": "icms_..." } }   (shown once)
```

Public reads are still allowed by default — auth only gates writes and admin endpoints. Override per collection via `access.read`. Migration notes for `0.1.x` deployments using `auth.adminSecret` live in [CHANGELOG.md](CHANGELOG.md).

## Status

| Layer | Status |
|---|---|
| Schema parser, REST API, hooks, access control, webhooks | ✅ Stable for 0.1.0 |
| PGlite + PostgreSQL drivers | ✅ Stable |
| Local + S3 storage | ✅ Stable |
| Type generation | ✅ Stable |
| GraphQL, version history, i18n | ⏳ Roadmap |

## Documentation

Full docs (config, fields, API, hooks, webhooks, deployment) live in the published package:

[**packages/core/README.md**](packages/core/README.md)

A VitePress docs site is also available under `packages/docs` (`pnpm --filter @infernocms/docs dev`).

## Packages

| Package | npm | Description |
|---|---|---|
| [`packages/core`](packages/core) | `infernocms` | Schema parser, database, REST API, CLI |
| [`packages/next`](packages/next) | `@infernocms/next` | Next.js extension: typed client codegen, webhook revalidation, image handling |
| [`packages/docs`](packages/docs) | _internal_ | VitePress documentation site |

## Examples

- [`examples/basic`](examples/basic) — blog with posts, authors, categories, blocks, hooks

## Project docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — how the pieces fit together
- [ROADMAP.md](ROADMAP.md) — phase-by-phase plan and current status
- [VISION.md](VISION.md) — the philosophy and what InfernoCMS is not
- [CHANGELOG.md](CHANGELOG.md) — release notes
- [CONTRIBUTING.md](CONTRIBUTING.md) — local development setup

## Development

```bash
pnpm install
pnpm dev          # runs the basic example (API on :4000)
pnpm build        # builds core
pnpm test         # runs core tests (32 tests)
```

Requires Node.js 18+ and pnpm.

## License

[AGPL-3.0-only](LICENSE)
