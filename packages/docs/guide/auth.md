# Authentication

InfernoCMS uses **token-first auth**. Every request — LLM pipeline, curl — sends a bearer token. There are no passwords, no sessions, no cookies, no OAuth.

## Three scopes

| Scope | What it can do |
|---|---|
| `read` | Read public collection content. Mostly equivalent to no token, useful only when a collection's `access.read` rule requires authentication. |
| `write` | Read + create + update content. Used by content pipelines and seeders. Cannot delete. |
| `admin` | Everything: read, write, delete, manage tokens, schema introspection. |

Tokens are stored in the `_infernocms_tokens` system table, hashed at rest with `sha256`. Plaintext is shown to the user **once** at creation time and never persisted in any retrievable form.

## Bootstrap on first run

The first time you start InfernoCMS, it creates an admin token automatically.

**Local dev:**
```bash
npx infernocms dev
```
prints the bootstrap token in a banner and appends it to `.env` if the file already exists:
```
═══════════════════════════════════════════════════════════════════
  InfernoCMS bootstrap admin token (save this — shown once)
  icms_AbCdEf...
═══════════════════════════════════════════════════════════════════
```

**Production (or hosting platforms):** set `INFERNOCMS_BOOTSTRAP_TOKEN` to a value of your choice before first start. InfernoCMS detects the env var and uses that exact token as the bootstrap admin token. Idempotent — safe to set on every start.

```bash
INFERNOCMS_BOOTSTRAP_TOKEN=icms_$(openssl rand -base64 32 | tr -d '=' | tr '+/' '-_') \
  npx infernocms start
```

## Using a token

```bash
# Verify a token (public endpoint, returns 401 if invalid)
curl http://localhost:4000/api/_auth/me \
  -H "Authorization: Bearer $TOKEN"
# → { "data": { "id": "...", "name": "bootstrap", "scope": "admin" } }

# Read content (public reads usually don't need a token)
curl http://localhost:4000/api/posts

# Create content (needs a write or admin token)
curl -X POST http://localhost:4000/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"hello","status":"published"}'
```

## Managing tokens

Using the bootstrap token, mint additional tokens via the `POST /api/_tokens` endpoint for things like content pipelines or read-only public sites. Each token has a name, a scope, a `created_at`, and a `last_used_at` for auditing.

```bash
# List active tokens
curl http://localhost:4000/api/_tokens \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Mint a write-scoped token for a content pipeline
curl -X POST http://localhost:4000/api/_tokens \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"content-pipeline","scope":"write"}'
# → { "data": { "id": "...", "plaintext": "icms_..." } }   (shown once)

# Revoke a token (idempotent)
curl -X DELETE http://localhost:4000/api/_tokens/<id> \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

`POST /api/_tokens` returns the `plaintext` exactly once. After that, only the hash is stored.

## Public reads

By default, `GET /api/{collection}` and `GET /api/{collection}/:id` are **public** — no token required. Override per collection via `access.read`:

```typescript
collections: {
  drafts: {
    fields: { /* ... */ },
    access: {
      read: ({ user }) => !!user,  // require any authenticated token
    },
  },
}
```

See [Access Control](/guide/access-control) for the full access-rule API.

## Endpoints reference

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/_health` | public | Liveness check |
| `GET /api/_auth/me` | any token | Verify the current token |
| `GET /api/_tokens` | admin | List active tokens (no plaintext, no hashes) |
| `POST /api/_tokens` | admin | Mint a new token |
| `DELETE /api/_tokens/:id` | admin | Revoke a token |
| `GET /api/_schema` | admin | Schema introspection |
| `POST /api/_upload` | write or admin | File upload |
| `GET /api/{collection}` | public by default | List items |
| `POST /api/{collection}` | write or admin | Create |
| `PATCH /api/{collection}/:id` | write or admin | Update |
| `DELETE /api/{collection}/:id` | admin | Delete |

## Migrating from `0.1.0` (`adminSecret` model)

`0.1.0` and earlier used a single `auth.adminSecret` config key plus an `x-admin-key` header. That mode is **removed**. To migrate:

1. Pull the new version, run once, capture the bootstrap token from the banner (or set `INFERNOCMS_BOOTSTRAP_TOKEN` yourself before starting).
2. Replace any `x-admin-key: <secret>` header in your seeders / pipelines with `Authorization: Bearer <token>`.
3. Remove `auth.adminSecret` and `auth.secret` from your `content.config.ts` — they're ignored.

That's it. There's no schema migration; the new system table is created on first start.
