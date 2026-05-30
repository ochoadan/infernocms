# Roadmap

## Where things stand (2026-05)

`0.1.0` shipped 2026-05-02. The schema engine, REST API, hooks, webhooks, access control, PGlite/Postgres drivers, local + S3 storage, and type generation are stable.

The codebase is now in a planned overhaul mapped to numbered sub-projects, each with its own design spec under `docs/superpowers/specs/` and an implementation plan under `docs/superpowers/plans/`. The plans are the living truth for in-flight work.

## Active sub-projects

| # | Sub-project | Status | Spec |
|---|---|---|---|
| 1 | InfernoCMS proper token-first auth | Plan written, executing | [`2026-05-08-cms-auth-design.md`](docs/superpowers/specs/2026-05-08-cms-auth-design.md) |
| 2 | Next.js extension package for NPM (`@infernocms/next`-style) | Not started | TBD |
| 4 | User-facing docs overhaul (LLM-consumable first) | Not started | TBD |
| 6 | End-to-end audit + cleanup of orphaned/misaligned code | Not started | TBD |

## What's next (after sub-projects 1–6)

- **Migration history** — production deployments currently apply safe migrations forward but don't keep a versioned migration log. Add one once the sub-project work settles.
- **Realtime preview / draft URLs** — for consumers building Next.js apps against InfernoCMS via the new extension package.

## Deferred / post-1.0

| Capability | Why deferred |
|---|---|
| GraphQL API | REST is the authoritative interface; LLMs handle REST predictably. GraphQL would be a separate optional layer. |
| Version history (rollbacks) | Useful but adds significant DB surface; revisit after sub-project 6. |
| Real-time collaboration (Google-Docs-style) | Out of scope. Token-based auth + conflict-on-save is the model. |
| Multi-tenancy in a single instance | Out of scope — run a separate InfernoCMS instance per project/tenant. |
| i18n (locales) | Solvable today via a `locale` field; first-class support waits for demand. |
| SSO / SAML / audit logs / workflow approvals | Enterprise concerns explicitly outside the project's scope. |

## Tech stack (locked)

| Layer | Choice |
|---|---|
| Runtime | Node.js 18+ (ESM) |
| API framework | Fastify 5 |
| DB (dev) | PGlite |
| DB (prod) | PostgreSQL via `postgres.js` |
| DB access | Raw SQL (no ORM) |
| Config loader | `jiti` |
| CLI | `cac` |
| File storage | Local / S3-compatible |
| Package manager | pnpm |
| Tests | Vitest |

## Decision log

Major decisions, append-only.

| Date | Decision | Why |
|---|---|---|
| 2026-01-22 | PGlite for dev, Postgres for prod | Zero-config dev with the same SQL surface as prod |
| 2026-01-22 | Fastify over Express | Performance, schema validation hooks |
| 2026-01-22 | Raw SQL over Drizzle/Prisma | Direct queries, no ORM friction, simpler codebase |
| 2026-01-22 | `jiti` for config loading | Load TS configs without a build step |
| 2026-01-22 | `cac` for CLI | Lightweight, good TS types |
| 2026-01-22 | Integer auto-increment IDs | Works the same on PGlite and Postgres, no UUID complexity for content rows |
| 2026-01-22 | Admin as separate Next.js app | Decouples API and UI; either can be deployed independently |
| 2026-02-10 | JSONB for localized fields | Avoids per-locale schema explosion, single column query |
| 2026-05-08 | Reframe: LLMs are the primary consumer | Locked-in product positioning; design API/error/docs around LLM correctness over human DX |
| 2026-05-08 | Token-first auth (no cookies, no `adminSecret`, no external JWT) | Eliminates the single-shared-key model; one mechanism for both human admins and LLM pipelines |
| 2026-05-08 | UUIDs (TEXT) for system tokens; integer IDs stay for content | App-side `crypto.randomUUID()` keeps tokens portable across PGlite/Postgres without `pgcrypto` |
| 2026-06-03 | Removed the bundled admin UI; InfernoCMS is API-first/headless | Focus the product on the REST API + schema engine; humans operate via code, REST, and `@infernocms/next` |
