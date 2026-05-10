# `@infernocms/next` Implementation Plan

> **For agentic workers:** Follow the plan task-by-task. Phase boundaries are commit boundaries (per memory: 1 phase = 1 commit). Tests are vitest. Lint by tsc strict.

**Goal:** Ship `@infernocms/next` covering: generated typed client (read + write), webhook revalidation route factory, CmsImage component, Next.js config plugin, and CLI codegen.

**Spec:** `docs/superpowers/specs/2026-05-08-next-extension-design.md` (authoritative).

**Architecture:** New monorepo workspace at `packages/next/`. Codegen reads consumer's `content.config.ts` via `loadConfig` from `infernocms` core. Generated artifacts land at `<consumer>/.infernocms-next/`. Runtime client uses native `fetch` with Next.js cache hints.

---

## Phase 1 — Workspace scaffold + first build-green

**Files:**
- `packages/next/package.json` — `@infernocms/next`, peer deps `next`, `react`, `infernocms`. Subpath exports: `.`, `./webhook`, `./config`, `./runtime`, `./image`. Bin: `infernocms-next`.
- `packages/next/tsconfig.json` — extends root tsconfig, `outDir: dist`, `rootDir: src`, `strict: true`.
- `packages/next/src/index.ts` — placeholder export `export const VERSION = '0.0.0'`.
- `packages/next/src/runtime/index.ts` — placeholder.
- `packages/next/src/index.test.ts` — sanity test for `VERSION` export.
- `packages/next/README.md` — short stub pointing to spec.
- Root `pnpm-workspace.yaml` — already includes `packages/*`, no change.

**Verification:**
- `pnpm install` from monorepo root.
- `pnpm --filter @infernocms/next build` produces `dist/`.
- `pnpm --filter @infernocms/next test` passes.

**Commit at end of phase.**

---

## Phase 2 — Codegen: types + client emitter

Read consumer's config, emit `.infernocms-next/types.ts` and `.infernocms-next/client.ts`.

**Files:**
- `packages/next/src/codegen/load-config.ts` — wraps `loadConfig` + `parseConfig` from `infernocms`. Returns the normalized config.
- `packages/next/src/codegen/emit-types.ts` — given normalized config, returns a string of TS interfaces. One interface per collection. Field types per field type table. Relations as `number | RelatedType` for depth-aware union.
- `packages/next/src/codegen/emit-client.ts` — emits `client.ts` with `cms` and `writeCms` typed re-exports keyed by collection name.
- `packages/next/src/codegen/index.ts` — `codegen(opts)` orchestrates: load config, emit, write to disk, ensure target dir exists.
- Tests: `emit-types.test.ts` (golden snapshot for a fixture config), `emit-client.test.ts` (golden snapshot), `index.test.ts` (writes both files to a tmp dir).

**Key generated shape (target output for fixture with `posts` and `authors`):**

`.infernocms-next/types.ts`:
```ts
// AUTO-GENERATED. Do not edit.
export interface Post {
  id: number;
  title: string;
  slug: string;
  body?: unknown;
  author?: number | Author;
  createdAt: string;
  updatedAt: string;
}
export interface Author {
  id: number;
  name: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}
export interface Schema {
  posts: Post;
  authors: Author;
}
```

`.infernocms-next/client.ts`:
```ts
// AUTO-GENERATED. Do not edit.
import { createReadClient, createWriteClientFactory } from '@infernocms/next/runtime';
import type { Schema } from './types';

export const cms = createReadClient<Schema>({
  url: process.env.INFERNOCMS_URL,
  readToken: process.env.INFERNOCMS_READ_TOKEN,
});

export const writeCms = createWriteClientFactory<Schema>({
  url: process.env.INFERNOCMS_URL,
});
```

**Tests cover:**
- 17 field types → correct TS types
- Required vs optional fields
- Relations (single + many)
- Slug field detection (only collections with `slug` field get `bySlug`)
- Block field types (refer to shared block interfaces)

**Commit at end of phase.**

---

## Phase 3 — Runtime read client

`createReadClient<Schema>(opts)` returns a typed object: `cms.{collection}.list()`, `byId()`, `bySlug()` (conditional), `byField()`, `count()`.

**Files:**
- `packages/next/src/runtime/fetch.ts` — `cmsFetch(url, opts, { token, cache })` — does the request, unwraps `{ data }`, throws structured `CmsApiError` on non-2xx with `{ status, code, message }`.
- `packages/next/src/runtime/read-client.ts` — `createReadClient<S>(opts)`. Returns `Proxy` keyed on collection name; each key returns an object with read methods. The proxy is what makes the typed shape work without per-collection codegen on the runtime side — codegen only emits the types.
- `packages/next/src/runtime/types.ts` — `ReadClient<S>`, `ListOpts`, `PaginatedResponse<T>`, `CommonOpts`, `CmsApiError`.
- `packages/next/src/runtime/index.ts` — re-exports.
- Tests: `read-client.test.ts` — uses `vi.stubGlobal('fetch', mockFetch)` like the existing core webhook tests. Covers: list with pagination/sort/filter/depth/fields, byId, bySlug, byField, count, error path, cache options pass-through.

**Cache defaults applied in `cmsFetch`:**
```ts
const next = {
  revalidate: opts.cache?.revalidate ?? 60,
  tags: opts.cache?.tags ?? [`cms:${collection}`],
};
fetch(url, { headers, next });
```

**Commit at end of phase.**

---

## Phase 4 — Runtime write client

`createWriteClientFactory<Schema>({ url })({ token })` returns the read client surface plus `create`, `update`, `delete` methods per collection. Server-only guard: throws if `typeof window !== 'undefined'`.

**Files:**
- `packages/next/src/runtime/write-client.ts` — `createWriteClientFactory<S>(baseOpts)({ token })`. Wraps the read client (reuses `createReadClient`) and adds writes.
- `packages/next/src/runtime/server-only.ts` — small helper `assertServer()` that throws if called in a browser.
- `packages/next/src/runtime/index.ts` — adds re-export.
- Tests: `write-client.test.ts` — covers create/update/delete; server-only guard; that read methods still work; that writes always send the bearer token.

**Commit at end of phase.**

---

## Phase 5 — Webhook revalidation factory

**Files:**
- `packages/next/src/webhook/route.ts` — `createInfernoCmsRevalidateRoute({ secret, paths? })` returns a Next.js route handler (POST). Validates bearer secret. Parses InfernoCMS webhook payload. Calls `revalidateTag('cms:${collection}')` and any paths returned by `paths()`.
- `packages/next/src/webhook/index.ts` — re-exports.
- Tests: `route.test.ts` — covers happy path, bad secret (401), malformed body (400), default tag revalidation, custom paths callback. Mocks `next/cache` `revalidateTag` and `revalidatePath`.

**Commit at end of phase.**

---

## Phase 6 — CmsImage + withInfernoCMS Next config plugin

**Files:**
- `packages/next/src/image/CmsImage.tsx` — wraps Next's `<Image>`. Resolves relative paths against `INFERNOCMS_URL`. Returns null for empty src. Forwards all `<Image>` props.
- `packages/next/src/image/index.ts`.
- `packages/next/src/config/with-inferno-cms.ts` — `withInfernoCMS({ url, configPath? })` returns a Next config wrapper. Adds CMS host to `images.remotePatterns`, attaches a webpack/turbopack plugin (or simpler: an `experimental.serverActions` no-op plus a `before-build` hook) that runs codegen.
- `packages/next/src/config/index.ts`.
- Tests:
  - `CmsImage.test.tsx` — rendering, prop forwarding, relative-path resolution, null src. Use `@testing-library/react` (add as devDep).
  - `with-inferno-cms.test.ts` — config merging, remotePatterns insertion.

**Codegen-on-build mechanism:** the plugin sets `process.env.INFERNOCMS_NEXT_CODEGEN` and registers a `register()` callback (via `next.config.ts` instrumentation) that calls `codegen()` on first `next dev` startup and re-runs on file change. For `next build`, it calls codegen synchronously before returning the resolved config. This is the simplest reliable hook; document the trade-offs.

**Commit at end of phase.**

---

## Phase 7 — CLI

**Files:**
- `packages/next/src/cli.ts` — bin entry. Uses `cac`. Subcommands: `codegen [--config <path>] [--out <dir>]`, `watch [--config <path>] [--out <dir>]`. `codegen` runs once and exits. `watch` uses `node:fs.watch` on `content.config.ts` (debounced 500ms) and re-runs.
- Bin in `package.json`: `"infernocms-next": "./dist/cli.js"`.
- Tests: `cli.test.ts` — invokes the CLI module's exported `run()` with a fixture cwd; verifies generated files.

**Commit at end of phase.**

---

## Phase 8 — Example wiring + README

**Files:**
- `packages/next/README.md` — full README with quick start, every public API, the spec link.
- `examples/next-blog/` — minimal Next.js 15 app pointed at `examples/basic`'s InfernoCMS instance. Demonstrates the read client, the webhook route, `CmsImage`. (If example bloat is a concern, skip and document only.)
- Optional: integrate into root `pnpm dev` script so `pnpm dev` boots both InfernoCMS basic + next-blog.

**Verification:**
- `pnpm install`, `pnpm --filter @infernocms/next build`, `pnpm -r test` — all green.
- `pnpm dev` (or manual) brings up InfernoCMS + next-blog; verify the example renders content.

**Commit at end of phase.**

---

## After all phases

- Update root `CHANGELOG.md` (Unreleased) noting `@infernocms/next` 0.1.0.
- Update root `README.md` packages table to add `@infernocms/next`.
- Update `CLAUDE.md` sub-projects table to mark sub-project 2 done.
- One final commit covering those housekeeping updates.

## Risks and how to handle them mid-flight

- **Generated path imports.** `@/.infernocms-next/client` is a TS path alias; if consumer doesn't use `@/*`, they import via relative path. Document both.
- **Next config plugin ordering.** If consumer wraps multiple plugins, our wrapper must compose. Use a function-of-config-returns-config pattern, not mutation.
- **Vitest + JSX.** CmsImage tests need vitest's React resolver. Add `@vitejs/plugin-react` as devDep to `packages/next` only.
- **Codegen schema fingerprint** for runtime drift is out of scope for v0.1 (per spec). Don't add it.

## Total commit count

8 phases + 1 housekeeping = 9 commits total. Backdate per session rule.
