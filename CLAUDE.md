# CLAUDE.md

Onboarding for AI coding agents working in this repo. Read this before making changes.

## What this is

InfernoCMS — a code-first headless CMS. `content.config.ts` defines schema, you get a REST API and an admin UI. Single npm package (`infernocms`) plus a Next.js admin and a VitePress docs site, all in a pnpm monorepo at `packages/`.

**Primary product consumer is LLMs / agentic content pipelines** (e.g. MassContent, inferno-content), not humans hand-authoring schemas. Design APIs, error messages, defaults, and docs around LLM correctness — predictable shapes, explicit constraints, actionable errors. Humans matter for the admin UI; LLMs matter for the API surface.

## Authoritative sources of truth

When the codebase and a doc disagree, prefer this order:

1. `docs/superpowers/specs/` — current approved designs. The latest spec for any subsystem is authoritative.
2. `docs/superpowers/plans/` — implementation plans being executed against those specs.
3. Source code under `packages/`.
4. `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md` — accurate at the documented version.
5. `ARCHITECTURE.md`, `VISION.md`, `ROADMAP.md` — partially stale; re-read after a major sub-project lands. Treat as background, not contract.
6. `packages/docs/` (VitePress site) — user-facing docs; subject to overhaul under sub-project 4.

## Sub-projects in flight (2026-05)

| # | Sub-project | Status | Spec |
|---|---|---|---|
| 1 | InfernoCMS proper token-first auth | Done | `docs/superpowers/specs/2026-05-08-cms-auth-design.md` |
| 2 | `@infernocms/next` extension package | Done | `docs/superpowers/specs/2026-05-08-next-extension-design.md` |
| 3 | Admin UI rebuild (shadcn preset `b1FktqLQI`) | Done | preset applied, vega-style primitives regenerated, bearer-token auth wired, token mgmt page added |
| 4 | User-facing docs overhaul | Auth + nav done; full LLM-first style pass deferred | new `guide/auth.md`, updated `guide/configuration.md`, `api/endpoints.md`, `index.md`, sidebar |
| 5 | Inferno Cloud next-auth integration | Done | Auth.js v5 JWT strategy, GitHub + Google providers; spec in `inferno-cloud/docs/specs/2026-05-08-next-auth-migration.md`; existing Supabase user IDs do not migrate, see spec |
| 6 | End-to-end audit + cleanup | Done | full monorepo build + test green; CronRadar downstream migrated; cross-repo state aligned |

## Repo layout

```
packages/
  core/    # The published npm package: schema, DB, REST API, CLI, auth
  admin/   # Next.js 15 admin UI (shadcn-based, rebuild in flight)
  docs/    # VitePress docs site
examples/
  basic/   # Reference content.config.ts exercising every field type
docs/superpowers/
  specs/   # Approved designs
  plans/   # Implementation plans
```

## Auth model (post sub-project 1)

Token-first, bearer-only. No cookies, no sessions, no `x-admin-key`, no externally-signed JWT.

- All requests authenticate with `Authorization: Bearer <token>`.
- Tokens are DB rows: `{ id, name, scope, hash, created_at, last_used_at, revoked_at }`.
- Three scopes: `read` / `write` / `admin`.
- Bootstrap admin token comes from `INFERNOCMS_BOOTSTRAP_TOKEN` env var, or generated on first run and printed + appended to `.env`.
- Admin UI = paste-token client. Token in localStorage, sent on every fetch.

If reading code that references `adminSecret`, `auth.secret`, `x-admin-key`, `infernocms-session`, `/api/_auth/login`, or `/api/_auth/logout`, it's pre-overhaul; check the sub-project 1 spec/plan for the replacement.

## Key files when changing core behavior

Read these before edits in their domain:

| Domain | Key files |
|---|---|
| HTTP / routing | `packages/core/src/api/server.ts`, `api/routes.ts`, `api/handlers.ts` |
| Auth | `packages/core/src/auth/` (post sub-project 1), `api/auth.ts` |
| Database & migrations | `database/connection.ts`, `database/migrator.ts`, `database/repository.ts` |
| Schema | `schema/define.ts`, `schema/fields.ts`, `config/loader.ts`, `config/parser.ts` |
| CLI | `cli/index.ts`, `cli/commands/start.ts`, `cli/commands/dev.ts` |
| Admin shell | `packages/admin/src/app/layout.tsx`, `components/admin-shell.tsx`, `lib/api.ts` |

## Editing rules for agents

- **Read before changing.** Before modifying load-bearing core files, read what's there now and surface a diff before writing.
- **Ask before invasive edits.** Cosmetic edits (UI, docs) don't need a gate; behavior changes to the API, schema, auth, or migrations do.
- **One commit per logical change.** Frequent commits, focused diffs, factual messages.
- **No AI attribution.** Commit messages, code comments, and pushed files must not include "Co-Authored-By: Claude", "AI-assisted", or any reference to the tool. Pushed content is the user's; the tooling stays invisible.
- **Commit messages are factual.** No feature lists, no changelog tone, no celebration. "add token CRUD endpoints" not "✨ Implement comprehensive token-first auth system 🚀".
- **No publish during EST work hours (8 AM–5 PM).** Don't push commits or publish packages with timestamps inside that window. If asked to push during work hours, surface the constraint and ask.
- **Prefer GitHub deps over npm publish** for cross-repo dependencies (e.g., other private packages depend on `github:ochoadan/infernocms`, not the npm version).

## Build / test commands

```bash
pnpm install                              # bootstrap workspace
pnpm dev                                  # run examples/basic — API on :4000, admin on :4001
pnpm build                                # build core (tsc) + admin (next)
pnpm --filter infernocms test             # run core test suite (vitest)
pnpm --filter infernocms test:watch       # vitest watch mode
pnpm --filter @infernocms/docs dev        # VitePress docs dev server
pnpm -r build && pnpm -r test             # full monorepo verify
```

## Conventions

- **Default ports:** API 4000, Admin 4001.
- **API response envelope:** `{ data: ... }` for success, `{ error: { message, code } }` for errors. Audit any endpoint that returns raw payloads.
- **Slug generation strips dots** (`slugify()` in `database/repository.ts`). `".NET"` → `"net"`. Provide explicit slugs for content where dots matter.
- **Tests live next to source** as `*.test.ts`, excluded from the published `dist/`.
- **Vitest** is the test framework. Pattern: `describe` / `it` / `expect`, see `webhooks.test.ts` for reference.
- **Root package.json re-exports** from `packages/core/dist/` so GitHub consumers (`github:ochoadan/infernocms`) get the right entry point. Don't break this.
