# Design: `@infernocms/next` — Next.js Extension Package

**Date:** 2026-05-08
**Status:** Approved (broad strokes); sub-decisions captured below by judgment
**Sub-project:** 2 of 6 in the 2026-05 InfernoCMS overhaul

## Goal

Eliminate the boilerplate every Next.js consumer of InfernoCMS currently rewrites: a fetch wrapper, response unwrapping, type assertions, ad-hoc revalidation routes, and image rendering. Ship a single package — `@infernocms/next` — that turns those into a few lines of consumer code, with types generated from the consumer's own `content.config.ts`.

## Non-goals

- Auth for the consuming app's end-users. The consuming app handles its own end-user auth.
- Admin UI primitives. Sub-project 3 (admin rebuild) owns the CMS admin.
- A general-purpose REST client for any CMS. This package only targets InfernoCMS.
- GraphQL, real-time/WebSocket previews, schema-derived form generators, custom field plugins.

## What it ships

A pnpm/npm package at `packages/next/`, published as `@infernocms/next`, providing four surfaces:

1. **Codegen CLI** — reads the consumer's `content.config.ts`, emits a typed client.
2. **Runtime client** — read client (public, RSC-safe) and a write-client factory (server-only, token-auth).
3. **Webhook revalidation route factory** — replaces ~120 lines of bespoke handler with ~10.
4. **`<CmsImage>` component + `withInfernoCMS()` Next config helper** — handles CMS-served images and `remotePatterns`.

## Codegen model (chosen: build-time)

Consumer's `content.config.ts` is the single source of truth. Codegen reads it (using the same `loadConfig` from `infernocms` core, so we don't reimplement parsing) and emits two files into `.infernocms-next/` at the project root:

- `.infernocms-next/types.ts` — TypeScript interfaces for every collection and shared block. Relations are typed as `number | RelatedType` (depth-aware unions for `?depth=1`).
- `.infernocms-next/client.ts` — re-exports the runtime client typed against the consumer's collection set.

Both files are **gitignored by convention** (we recommend a `.gitignore` entry; the codegen step regenerates them on `dev` and `build`). They're in the project root, not `node_modules`, so editor jump-to-definition works without extra plumbing.

## Client API (chosen: object/method, two-client split)

```ts
// .infernocms-next/client.ts (generated)
import { cms, writeCms } from '@infernocms/next/runtime';
import type { Schema } from './types';
export { cms } from '@infernocms/next/runtime';
export const writeCms = (opts: { token: string }) => writeCmsFactory<Schema>(opts);
```

**Read client (public, RSC-safe).** Imported anywhere — server components, route handlers, server actions. No token by default; reads are typically public (collection `access.read` defaults to true).

```ts
import { cms } from '@/.infernocms-next/client';

const posts = await cms.posts.list({
  where: { status: 'published' },
  sort: '-createdAt',
  page: 1,
  perPage: 10,
  depth: 1,
});
const post = await cms.posts.bySlug('hello-world', { depth: 1 });
const one  = await cms.posts.byId(42);
const n    = await cms.posts.count({ where: { status: 'published' } });
```

**Write client (server-only, token).** Returned from a factory because writes always need a token; making it explicit prevents accidental client-component imports.

```ts
import 'server-only';
import { writeCms } from '@/.infernocms-next/client';

const wc = writeCms({ token: process.env.INFERNOCMS_WRITE_TOKEN! });

const created = await wc.submissions.create({ email, message });
const updated = await wc.posts.update(42, { status: 'published' });
await wc.posts.delete(42);
```

The write client also exposes the read methods (so consumers don't juggle two imports for combined read/write flows).

**Method shape per collection:**

| Read client | Write client (adds these) |
|---|---|
| `list(opts?)` | `create(data)` |
| `byId(id)` | `update(id, data)` |
| `bySlug(slug)` (only if collection has a `slug` field) | `delete(id)` |
| `byField(field, value)` | |
| `count(where?)` | |

`opts` is `{ where?, sort?, page?, perPage?, depth?, fields?, search?, cache? }`. Maps directly to InfernoCMS's existing query parameters; no new query language to learn.

`cache` per call: `{ revalidate?: number | false; tags?: string[] }`. Defaults are opinionated — see Caching below.

## Caching defaults

Read client defaults every fetch to:

```ts
fetch(url, { next: { revalidate: 60, tags: [`cms:${collection}`] } })
```

- `revalidate: 60` — sane default for content sites; consumers override per call.
- `tags: ['cms:${collection}']` — automatic tag per collection. The webhook handler revalidates these tags by default, which means once you wire up the webhook route, content updates propagate without per-page revalidate config.

Override via `cms.posts.list({ cache: { revalidate: false } })` (one-off no-cache) or `{ tags: ['custom'] }`.

## Webhook revalidation route factory

```ts
// app/api/cms/webhook/route.ts (consumer code)
import { createInfernoCmsRevalidateRoute } from '@infernocms/next/webhook';

export const POST = createInfernoCmsRevalidateRoute({
  secret: process.env.INFERNOCMS_WEBHOOK_SECRET!,
  // optional: derive paths in addition to default tag revalidation
  paths: ({ event, collection, data }) => {
    if (collection === 'posts' && data.slug) {
      return ['/blog', `/blog/${data.slug}`];
    }
    return [];
  },
});
```

Default behavior with no `paths` callback: calls `revalidateTag('cms:${collection}')`. Combined with the read-client default tagging, a single registered webhook + this route is enough for the whole site to refresh.

The factory:
- Validates the bearer secret (`Authorization: Bearer <secret>`).
- Parses InfernoCMS's webhook payload shape (`{ event, collection, data, timestamp }`).
- Calls `revalidateTag()` for the default tag.
- Calls `revalidatePath()` for any paths returned by `paths()`.
- Returns `200 OK` on success, `401` on bad secret, `400` on malformed body.

Replaces CronRadar's 120-line `/app/api/revalidate/route.ts` with the snippet above.

## Image handling

```tsx
import { CmsImage } from '@infernocms/next';

<CmsImage src={post.cover} alt={post.title} width={800} height={400} />
```

`<CmsImage>` is a thin wrapper around Next's `<Image>`:
- Accepts a string from a CMS `image` or `file` field. Resolves relative paths (`/uploads/foo.jpg`) against `process.env.INFERNOCMS_URL`.
- Forwards every other prop straight through to `<Image>` (including `fill`, `sizes`, `priority`, `placeholder`, etc.).
- Returns `null` if `src` is empty/null (so consumers can use it on optional fields without conditionals).

## Next.js config plugin

```ts
// next.config.ts
import { withInfernoCMS } from '@infernocms/next/config';

export default withInfernoCMS({
  url: process.env.INFERNOCMS_URL,
  configPath: './content.config.ts',  // optional, default
})({
  // your existing next config
});
```

What it does:
- Auto-runs codegen on `next dev` (watch mode) and `next build` (one-shot).
- Adds the CMS domain to `images.remotePatterns` so `<CmsImage>` works without manual config.
- Validates `INFERNOCMS_URL` is set; warns if not.

If a consumer doesn't want the plugin, they can run `infernocms-next codegen` manually as a `predev`/`prebuild` script and configure `remotePatterns` themselves.

## CLI

```bash
npx infernocms-next codegen [--config content.config.ts] [--out .infernocms-next]
npx infernocms-next watch    # watch mode for non-Next.js consumers
```

Bin name `infernocms-next` (separate from `infernocms`). Lives at `packages/next/dist/cli.js`.

## Auth posture

- **Reads:** public by default. If the consumer's CMS gates reads, they pass `INFERNOCMS_READ_TOKEN` (env). The read client picks it up automatically.
- **Writes:** always require a token, passed explicitly to `writeCms({ token })`. No env-var fallback for writes — explicit is better here, prevents the client from quietly elevating privilege.
- **Webhook:** uses a separate `INFERNOCMS_WEBHOOK_SECRET` configured at webhook registration time (server-side, never exposed to clients).

## Draft mode (deferred)

Out of scope for v0.1 of `@infernocms/next`. Notes for the future spec:
- Need a "show unpublished content" semantic in InfernoCMS itself first. Today, draft/published is a `status` field convention, not a built-in concept. So draft mode would require: (1) consumer-defined "draft predicate" passed to the plugin, (2) read client switches to a write-token-authenticated request when Next.js's draft mode is enabled, (3) consumer-defined "exit draft mode" route handler.
- Cleaner to wait until InfernoCMS core grows a first-class draft/version concept (post sub-project 6).

## Package layout

```
packages/next/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── runtime/          # read + write client implementations
│   │   ├── client.ts     # base classes, exported as types via codegen
│   │   ├── fetch.ts      # the underlying request/response handler
│   │   └── types.ts      # CommonOpts, PaginatedResponse, etc.
│   ├── codegen/          # CLI + emitter
│   │   ├── index.ts      # codegen entry — reads config, writes files
│   │   ├── emit-types.ts # TS interface emitter per collection
│   │   ├── emit-client.ts# client.ts emitter
│   │   └── load-config.ts# wraps `loadConfig` from infernocms
│   ├── webhook/
│   │   └── route.ts      # createInfernoCmsRevalidateRoute
│   ├── image/
│   │   └── CmsImage.tsx
│   ├── config/
│   │   └── with-inferno-cms.ts  # next config plugin
│   ├── cli.ts            # bin entry
│   └── index.ts          # main package entry — re-exports
└── tests/                # vitest
```

Published exports (subpath imports for tree-shaking):
- `@infernocms/next` — main runtime types and the read `cms` typed shell
- `@infernocms/next/webhook` — `createInfernoCmsRevalidateRoute`
- `@infernocms/next/config` — `withInfernoCMS`
- `@infernocms/next/runtime` — internals used by generated `client.ts`

## Dependencies

- `infernocms` (peer + dev) — uses `loadConfig`, `parseConfig` from core for codegen
- `next` (peer) — `>=14`
- `react` (peer)
- `cac` (runtime, for CLI)

Avoid adding heavy deps. No swc, no babel, no schema-of-schemas library.

## Risks / open questions

1. **TypeScript strict mode in consumer projects.** Generated types will live in `.infernocms-next/` outside the consumer's normal `src/`. Need to ensure their `tsconfig.json` `include` covers this path. The Next plugin adds it; standalone codegen mode requires consumer-side config (documented).
2. **Schema drift between codegen run and runtime CMS.** If the consumer regenerates types but the CMS hasn't deployed the matching schema yet, types lie. Mitigation: codegen embeds a schema fingerprint in the generated client; runtime client logs a warning if `/api/_schema` doesn't match. Out-of-scope for v0.1; flagged for future.
3. **Server-only enforcement on the write client.** Today we rely on convention (`import 'server-only'`). Could add a runtime check that throws if `writeCms` is called in a browser context. Implement.
4. **The codegen import of `infernocms`** means consumers who only want the read client still pull in the whole CMS package. Mitigation: `infernocms` is a peerDep used only at codegen time; runtime client doesn't import it. Consumers running codegen at build time on a server are fine. Codegen on edge/serverless requires the dep at build time only.

## Out of scope (post-v0.1)

- Schema-fingerprint runtime drift detection
- Draft mode
- Live/preview WebSocket
- React hooks (`useCollection`, `useItem`) for client components — Next.js RSC patterns make these mostly unnecessary; revisit if consumers ask
- Auto-generated admin form components from schema (admin's job)
- Pluggable serializer for richtext / blocks rendering
