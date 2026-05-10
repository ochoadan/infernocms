# Design: InfernoCMS Token-First Auth

**Date:** 2026-05-08
**Status:** Approved (pending implementation)
**Sub-project:** 1 of 6 in the 2026-05 InfernoCMS overhaul

## Goal

Replace InfernoCMS's current admin auth (a single shared `adminSecret` plus dead-code JWT bearer plus session cookies) with a single, proper token-based system designed around the fact that the primary API consumer is LLMs and content pipelines, not humans.

## Non-goals

- Auth for applications consuming InfernoCMS content. Consuming apps (CronRadar, MassContent sites) handle their own end-user auth however they want. InfernoCMS does not ship next-auth scaffolding.
- OAuth providers, password login, MFA, magic links, sessions, cookies — none of these are in scope. Tokens are the only auth.
- Multi-user collaboration UX. The admin UI assumes 1–N humans, each pasting a token. Token records have a `name` for audit but no user-account model.
- This is `infernocms`. Inferno Cloud's own dashboard auth is a separate sub-project (uses next-auth) and is not affected by this design.

## Architecture

**One auth mechanism: bearer tokens.** Every request — API call from an LLM pipeline, fetch from the admin UI, anything — authenticates the same way:

```
Authorization: Bearer <token>
```

Tokens are first-class records in a system-managed `_infernocms_tokens` table. The admin UI is a thin token client: paste-once, store in `localStorage`, send as the `Authorization` header on every request.

No cookies. No sessions. No JWT. No `x-admin-key`. No `/api/_auth/login`.

## Data model

System table managed outside the user-config migration system:

```sql
CREATE TABLE "_infernocms_tokens" (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  scope        TEXT NOT NULL CHECK (scope IN ('read','write','admin')),
  token_hash   TEXT NOT NULL UNIQUE,  -- sha256 hex of the plaintext token
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by   UUID NULL REFERENCES "_infernocms_tokens"(id) ON DELETE SET NULL,
  last_used_at TIMESTAMP NULL,
  revoked_at   TIMESTAMP NULL
);

CREATE INDEX "idx_tokens_hash_active" ON "_infernocms_tokens" (token_hash) WHERE revoked_at IS NULL;
```

Stored alongside `_infernocms_migrations`. Created and maintained by a new `ensureSystemTables()` step that runs before user-schema migrations on every server start.

## Token format

Plaintext token: `icms_<32 random bytes, base64url>`. Total length ≈ 43 chars after prefix. The `icms_` prefix makes leaks pattern-greppable in CI / secret scanners.

Verification:
1. Strip `icms_` prefix (reject if absent).
2. `sha256` the full plaintext (including prefix).
3. Look up in `_infernocms_tokens` where `token_hash = ?` AND `revoked_at IS NULL`.
4. On hit: set `req.user = { id, scope, _isAdmin: scope === 'admin' }`, async-update `last_used_at`.
5. On miss: 401.

Tokens are shown to the human exactly once at creation. Stored hashed at rest. A DB leak does not expose tokens.

## Scopes

Three scopes:

| Scope | Read | Create | Update | Delete | Admin endpoints (`/api/_schema`, `/api/_upload`, `/api/_tokens`) |
|---|---|---|---|---|---|
| `read` | ✓ | — | — | — | — |
| `write` | ✓ | ✓ | ✓ | — | — |
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ |

`read` exists for safety only — public read access is currently allowed without auth, so a `read` token is equivalent to no token for content endpoints. It still matters for any future per-collection access rule that requires an authenticated reader.

`access.ts`'s `effectiveAccess` defaults stay structurally similar but key off `req.user.scope` instead of the loose `_isAdmin` flag. Per-collection rules in user config can still override.

## Bootstrap flow

On every server start, after `ensureSystemTables()`:

```
if (process.env.INFERNOCMS_BOOTSTRAP_TOKEN) {
  // Cloud-provided or operator-provided. Use as the bootstrap admin token.
  upsert into _infernocms_tokens with scope='admin', name='bootstrap', hash=sha256(env)
  // Idempotent: if a token with this hash already exists and is not revoked, no-op.
} else if (no admin tokens exist) {
  // First run, no env var. Generate one.
  const token = "icms_" + randomBase64Url(32)
  insert into _infernocms_tokens (scope='admin', name='bootstrap')
  print to stdout (red banner, hard to miss)
  if (.env exists or is writable in cwd) append "INFERNOCMS_BOOTSTRAP_TOKEN=<token>"
}
```

This satisfies all three personas:

- **Local dev**: first `pnpm cms dev` prints + writes to `.env`. User pastes into admin UI on first load.
- **Self-host prod**: first `pnpm cms start` prints + writes to `.env`. Operator captures it.
- **Inferno Cloud provisioning**: Cloud generates the token, sets `INFERNOCMS_BOOTSTRAP_TOKEN=<value>` in the PM2 ecosystem env. CMS uses it. Cloud knows it, so it can deep-link the user into `/admin?token=<value>` already authenticated.

The bootstrap token is **not special at runtime** — it's just an admin token named `bootstrap`. The user can revoke it once they've created their own.

## Config surface

Before:

```ts
auth: { secret?: string; adminSecret?: string }
```

After:

```ts
// auth-types.ts deleted entirely. AuthConfig type removed.
// `auth` key removed from InfernoCMSConfig.
```

The `auth` config knob is gone. Token-based auth is always on. There is no "no auth" mode in the new design — if someone wants public unauthenticated access to content, the existing per-collection `access` rules handle it (`access.read = true` keeps reads open).

`server.ts` no longer accepts `auth` in `ServerOptions`. The auth middleware is registered unconditionally.

## API surface

**Removed:**
- `POST /api/_auth/login`
- `POST /api/_auth/logout`
- `x-admin-key` header support
- Externally-signed JWT bearer mode
- Session cookie (`infernocms-session`)

**Added:**
- `GET /api/_auth/me` — returns `{ data: { id, name, scope } }` for the bearer token, or 401. Used by admin UI to validate a pasted token.
- `GET /api/_tokens` — list non-revoked tokens. `admin` scope only. Returns `{ data: [{ id, name, scope, created_at, last_used_at }] }`. **Never returns plaintext or hashes.**
- `POST /api/_tokens` — create a new token. Body: `{ name, scope }`. Response: `{ data: { id, name, scope, plaintext } }` — plaintext is present **only on this response**, never persisted in any retrievable form.
- `DELETE /api/_tokens/:id` — revoke. Sets `revoked_at = now()`. Idempotent.

All endpoints use the standard `{ data }` / `{ error: { message, code } }` envelope (fixes one of the audit findings from the prior audit).

## Admin UI flow

1. **First load**: localStorage has no token → render a paste-token screen ("Paste your InfernoCMS admin token. You generated this on first start, or your hosting provider gave it to you.").
2. **Paste flow**: client POSTs token to `/api/_auth/me`. On 200, save to `localStorage["infernocms-token"]`. On 401, error toast.
3. **Authenticated**: every fetch sends `Authorization: Bearer ${localStorage.getItem("infernocms-token")}`. No `credentials: 'include'`.
4. **Logout**: clear localStorage, redirect to paste screen.
5. **Settings → Tokens**: lists tokens via `/api/_tokens`. Create button mints a new one and shows the plaintext exactly once with a copy button and a "I've saved this" confirmation. Revoke button removes a token.
6. **Cloud deep-link**: support `?token=<value>` query param on first load — saves to localStorage, scrubs from URL, proceeds to dashboard.

## Migration: hard break

Existing deployments using `adminSecret` will stop working on upgrade. The user explicitly chose this (option 1A). What happens:

- On first start with new code, `ensureSystemTables()` creates `_infernocms_tokens`.
- Bootstrap flow runs. If `INFERNOCMS_BOOTSTRAP_TOKEN` env is set OR no admin tokens exist, an admin token gets created.
- Old `adminSecret` in config is **ignored**. If present, log a one-time deprecation warning: "auth.adminSecret in config is no longer used; tokens are managed via the admin UI."
- Old `secret` in config is **ignored**. Same warning.

CronRadar (currently uses `adminSecret`) will need a one-time touch:
1. Pull new InfernoCMS, run, capture printed bootstrap token.
2. Replace `x-admin-key` header in the seeder / pipeline with `Authorization: Bearer <token>`.
3. Optionally generate a scoped `write` token via the admin UI for the seeder.

Documented in the migration section of the new docs.

## Files affected

**Replaced:**
- `packages/core/src/api/auth.ts` — gutted; new bearer-token middleware + token CRUD route registration.
- `packages/core/src/config/auth-types.ts` — deleted.
- `packages/admin/src/lib/api.ts` — replace cookie-based fetches with bearer header from localStorage; remove `login`/`logout` functions; add `setToken`, `clearToken`, `getMe`, `listTokens`, `createToken`, `revokeToken`.

**Modified:**
- `packages/core/src/api/routes.ts` — remove `auth?` parameter; auth is always on. Update `effectiveAccess` to key off scope. Add token CRUD routes (admin-scoped).
- `packages/core/src/api/server.ts` — remove cookie plugin, remove `auth` ServerOption, register auth middleware unconditionally, simplify CORS (no `credentials: true`).
- `packages/core/src/database/migrator.ts` — add `ensureSystemTables()` step that creates `_infernocms_tokens` (alongside existing `_infernocms_migrations`).
- `packages/core/src/cli/commands/start.ts` and `dev.ts` — call `ensureSystemTables()` and run bootstrap flow before `startServer`.
- `packages/core/src/index.ts` — remove `AuthConfig` export, remove `auth` from re-exports.
- `packages/core/src/config/types.ts` — remove `AuthConfig` re-export.

**New:**
- `packages/core/src/auth/tokens.ts` — token generation, hashing, lookup, lifecycle.
- `packages/core/src/auth/bootstrap.ts` — first-run bootstrap logic (env var > generate-and-print).
- `packages/core/src/auth/middleware.ts` — Fastify hook that validates bearer tokens and sets `req.user`.
- `packages/admin/src/app/login/page.tsx` — paste-token screen (replaces whatever current login is).
- `packages/admin/src/app/settings/tokens/page.tsx` — token management UI.

**Removed wholesale:**
- All cookie handling in admin UI.
- `@fastify/cookie` dependency in core.

## Risks

1. **`gen_random_uuid()` requires pgcrypto** in older PostgreSQL versions. Modern Postgres (13+) has it built in via `pgcrypto`/`uuid-ossp` or `gen_random_uuid()` in 13+. PGlite (used in dev) supports it. **Mitigation:** generate UUIDs in application code (`crypto.randomUUID()`) and insert them, instead of relying on DB default. Keeps it portable.

2. **Token in URL (`?token=...` deep-link)** — query strings can leak via referer headers, browser history, server logs. **Mitigation:** scrub from URL via `history.replaceState()` immediately on receipt; only support this on the first-load page; document the risk.

3. **`localStorage` token storage** — vulnerable to XSS. The admin UI is the only client; it's a content management UI, so an XSS would be game-over regardless of where the token lives (an attacker with XSS can just call `/api/...` from the user's browser). Bearer-in-localStorage vs cookie-with-`HttpOnly` doesn't meaningfully change the threat model here. **Mitigation:** standard XSS hardening — strict CSP on the admin UI, sanitize all user-rendered content, no `innerHTML` from API responses.

4. **Hard break for CronRadar.** It will start failing on the next CMS upgrade. **Mitigation:** coordinate the upgrade — patch CronRadar's seeder + pipeline to use bearer tokens BEFORE bumping CMS version in `package.json`.

5. **`.env` write on first start** is somewhat unusual behavior. **Mitigation:** only write if a `.env` file already exists in cwd, or if explicitly opted in via `--write-env` flag. Always print to stdout regardless.

## Out of scope (future)

- Token rotation API (regenerate without revoking the existing one)
- Token expiration / TTL
- Per-collection scoping (audited, deferred — rejected as too much surface for LLM error budget)
- Refresh tokens
- Audit log of token usage beyond `last_used_at`
