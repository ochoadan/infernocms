# InfernoCMS

A headless CMS that gets out of your way — define content in code, get a REST API instantly.

> **0.1.0** ships the API + schema engine. InfernoCMS is headless — you operate it through the REST API, the CLI, and `@infernocms/next`. The core API is stable.

## Quick start

```bash
npm install infernocms
```

Create `content.config.ts`:

```typescript
import { defineConfig, field } from 'infernocms';

export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: field.text({ required: true }),
        body: field.richtext(),
        published: field.boolean(),
      }
    }
  }
});
```

```bash
npx infernocms dev
```

API at `http://localhost:4000/api/posts`.

## Config

### Verbose syntax

```typescript
import { defineConfig, field } from 'infernocms';

export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: field.text({ required: true }),
        slug: field.slug({ from: 'title' }),
        excerpt: field.text({ maxLength: 200 }),
        body: field.richtext(),
        cover: field.image(),
        author: field.relation({ collection: 'authors' }),
        tags: field.relation({ collection: 'tags', many: true }),
        status: field.select({ options: ['draft', 'published'], default: 'draft' }),
        publishedAt: field.datetime(),
      }
    },
    authors: {
      fields: {
        name: field.text({ required: true }),
        email: field.text(),
        avatar: field.image(),
      }
    },
    tags: {
      fields: {
        name: field.text({ required: true }),
        slug: field.slug({ from: 'name' }),
      }
    }
  }
});
```

### Shorthand syntax

```typescript
export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: 'text!',              // ! = required
        slug: 'slug:title',          // slug from title field
        body: 'richtext',
        cover: 'image',
        author: 'rel:authors',       // relation to authors
        tags: 'rel:tags[]',          // [] = many-to-many
        status: 'select:draft,published',
        publishedAt: 'datetime',
      }
    }
  }
});
```

## Field types

| Type | Options |
|------|---------|
| `text` | `required`, `maxLength`, `default` |
| `textarea` | `required`, `maxLength`, `default` |
| `number` | `required`, `integer`, `default` |
| `boolean` | `required`, `default` |
| `select` | `required`, `options[]`, `default` |
| `datetime` | `required`, `default` |
| `date` | `required`, `default` |
| `json` | `required`, `default` |
| `richtext` | `required` |
| `image` | `required`, `default` |
| `file` | `required`, `default` |
| `relation` | `required`, `collection`, `many` |
| `slug` | `required`, `from`, `default` |
| `blocks` | `required`, `allowed[]` |
| `link` | `required` |
| `group` | `required`, `fields` |
| `array` | `required`, `fields` |

All fields also accept `silent: true` to flag them as hidden from any consuming UI (still readable and writable via API, and still present in schema introspection).

Slugs auto-generate from the `from` field on create and update when blank. Explicit values are slugified as-is.

`link` expects `{ url, label?, target? }` where `target` is `"_self"` (default) or `"_blank"`.

`group` and `array` define nested fields:

```typescript
// group: single nested object
metadata: field.group({
  fields: {
    source: field.text(),
    campaign: field.text(),
  }
})

// array: list of nested objects
links: field.array({
  fields: {
    label: field.text({ required: true }),
    url: field.text({ required: true }),
  }
})
```

Every collection automatically gets `id` (auto-increment integer), `createdAt`, and `updatedAt` columns. Disable timestamps with `timestamps: false` on the collection.

## API

### Endpoints

Every collection gets these endpoints:

```
GET    /api/{collection}          # List items
GET    /api/{collection}/:id      # Get single item
POST   /api/{collection}          # Create item
PUT    /api/{collection}/:id      # Full update (enforces required fields)
PATCH  /api/{collection}/:id      # Partial update (skips required field validation)
DELETE /api/{collection}/:id      # Delete item
```

System endpoints:

```
GET    /api/_health               # Health check
GET    /api/_schema               # Schema introspection (admin scope)
POST   /api/_upload               # File upload (multipart, 10MB limit; write/admin scope)
GET    /api/_auth/me              # Identify the current bearer token
GET    /api/_tokens               # List tokens (admin scope)
POST   /api/_tokens               # Mint a token (admin scope; plaintext returned once)
DELETE /api/_tokens/:id           # Revoke a token (admin scope)
```

Upload expects a `file` multipart field. Accepted extensions: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.avif`, `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`, `.txt`, `.mp4`, `.webm`, `.mp3`, `.wav`, `.ogg`, `.zip`, `.json`. Returns `{ "data": { "url": "...", "filename": "...", "ext": "..." } }`.

### Query parameters

```
?limit=10&offset=0               # Pagination (default 10, max 100)
?page=2&perPage=10               # Pagination (page-based)
?sort=createdAt                  # Sort ascending
?sort=-createdAt                 # Sort descending (prefix -)
?fields=id,title,slug            # Field selection
?depth=1                         # Resolve relations (max depth 2)
?search=hello                    # Search across text/textarea fields
```

### Filter operators

Filters use query parameters with `_{operator}` suffix:

| Operator | Example |
|----------|---------|
| `eq` (default) | `?status=published` |
| `ne` | `?status_ne=draft` |
| `gt` | `?price_gt=10` |
| `gte` | `?price_gte=10` |
| `lt` | `?price_lt=100` |
| `lte` | `?price_lte=100` |
| `contains` | `?title_contains=hello` |
| `startsWith` | `?title_startsWith=Hello` |
| `endsWith` | `?title_endsWith=world` |
| `in` | `?status_in=draft,published` |

`contains`, `startsWith`, and `endsWith` are case-insensitive. Multiple filters are combined with AND.

### Response format

```jsonc
// List — GET /api/posts
{
  "data": [
    { "id": 1, "title": "Hello", "status": "published" }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "perPage": 10,
    "totalPages": 5
  }
}

// Single — GET /api/posts/1
{
  "data": {
    "id": 1,
    "title": "Hello",
    "author": 5,
    "createdAt": "2026-01-22T10:00:00.000Z",
    "updatedAt": "2026-01-22T10:00:00.000Z"
  }
}

// With depth=1 — GET /api/posts/1?depth=1
{
  "data": {
    "id": 1,
    "title": "Hello",
    "author": { "id": 5, "name": "Jane", "avatar": "/uploads/jane.jpg" }
  }
}

// Error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field \"title\" is required",
    "details": [
      { "field": "title", "message": "Field \"title\" is required" }
    ]
  }
}
```

## Blocks

Define reusable content blocks for flexible page building.

### Config

```typescript
export default defineConfig({
  blocks: {
    hero: {
      fields: {
        heading: field.text({ required: true }),
        subheading: field.text(),
        image: field.image(),
      }
    },
    richtext: {
      fields: {
        content: field.richtext(),
      }
    },
    cta: {
      fields: {
        heading: field.text(),
        buttonText: field.text(),
        buttonLink: field.text(),
        variant: field.select({ options: ['default', 'dark'], default: 'default' }),
      }
    },
  },

  collections: {
    pages: {
      fields: {
        title: field.text({ required: true }),
        slug: field.slug({ from: 'title' }),
        blocks: field.blocks({ allowed: ['hero', 'richtext', 'cta'] }),
      }
    }
  }
});
```

### API format

Blocks are returned as an array:

```json
[
  {
    "type": "hero",
    "id": "block_abc123",
    "heading": "Welcome",
    "subheading": "Build faster",
    "image": "/uploads/hero.jpg"
  },
  {
    "type": "richtext",
    "id": "block_def456",
    "content": [{ "type": "paragraph", "children": [{ "text": "Hello world" }] }]
  }
]
```

## Auth

Token-first. Every request authenticates with `Authorization: Bearer <token>` — no passwords, sessions, cookies, or OAuth. Tokens are first-class rows in the `_infernocms_tokens` system table, hashed at rest, each with one of three scopes:

| Scope | Can |
|-------|-----|
| `read` | Read content |
| `write` | Read + create/update/delete content, upload files |
| `admin` | Everything, plus manage tokens and read `/api/_schema` |

A bootstrap `admin` token is set via the `INFERNOCMS_BOOTSTRAP_TOKEN` env var, or generated on first start, printed to stdout, and appended to `.env` if present.

```bash
# Identify the current token
curl http://localhost:4000/api/_auth/me -H "Authorization: Bearer $TOKEN"

# Mint a write-scoped token (plaintext returned once)
curl -X POST http://localhost:4000/api/_tokens \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"content-pipeline","scope":"write"}'
```

Public reads are allowed by default — auth gates writes and admin endpoints. Override per collection via `access.read`.

### Access control

Per-collection access rules:

```typescript
export default defineConfig({
  collections: {
    posts: {
      access: {
        read: () => true,                              // public
        create: ({ user }) => !!user,                   // any authenticated token
        update: ({ user, item }) =>
          user?.scope === 'admin' || item.author === user?.id,
        delete: ({ user }) => user?.scope === 'admin',
      },
      fields: { /* ... */ }
    }
  }
});
```

Access rules receive `{ user }` for read/create and `{ user, item }` for update/delete. `user` is the authenticated token (`{ id, name, scope }`) or `null` for an unauthenticated request. Rules can be `boolean`, sync functions, or async functions.

## Hooks

Lifecycle hooks on collections:

```typescript
export default defineConfig({
  collections: {
    posts: {
      hooks: {
        beforeCreate: async ({ data }) => {
          data.publishedAt = new Date().toISOString();
          return data;  // return modified data
        },
        afterCreate: async ({ item }) => {
          console.log('Created:', item.id);
        },
        beforeUpdate: async ({ id, data, existing }) => {
          if (data.status === 'published' && !existing.publishedAt) {
            data.publishedAt = new Date().toISOString();
          }
          return data;
        },
        afterUpdate: async ({ id, item }) => { /* ... */ },
        beforeDelete: async ({ id, existing }) => {
          return false;  // return false to cancel deletion
        },
        afterDelete: async ({ id }) => { /* ... */ },
      },
      fields: { /* ... */ }
    }
  }
});
```

`before*` hooks can return modified data (or nothing to leave data unchanged). Only `beforeDelete` can return `false` to cancel the operation.

## Webhooks

Send HTTP notifications on content changes.

### Config

```typescript
export default defineConfig({
  webhooks: [
    {
      url: 'https://example.com/hook',
      events: ['create', 'update', 'delete'],   // optional, defaults to all
      collections: ['posts'],                    // optional, defaults to all
      secret: 'webhook-signing-secret',          // optional, enables HMAC signing
    }
  ],
  // ...
});
```

### Payload

```json
{
  "event": "create",
  "collection": "posts",
  "timestamp": "2026-01-22T10:00:00.000Z",
  "data": { "id": 1, "title": "Hello" }
}
```

### HMAC signing

When `secret` is set, the request includes an `X-Inferno-Signature` header containing the HMAC-SHA256 hex digest of the JSON body:

```javascript
// Verify on your server:
const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
if (signature !== expected) throw new Error('Invalid signature');
```

Webhooks are fire-and-forget with a 10-second timeout. Failed deliveries are logged but not retried.

## Type generation

Auto-generates TypeScript types from your config:

```bash
npx infernocms generate types
```

Output at `.infernocms/types.ts` (also auto-generated on `dev` startup and config reload):

```typescript
// Auto-generated by InfernoCMS — do not edit manually

export interface Post {
  id: number;
  title: string;
  slug?: string;
  body?: unknown;
  author?: number | Author;
  tags?: (number | Tag)[];
  status?: 'draft' | 'published';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Author {
  id: number;
  name: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionTypes {
  posts: Post;
  authors: Author;
}
```

Use in your app:

```typescript
import type { Post } from './.infernocms/types';

const res = await fetch('/api/posts');
const { data }: { data: Post[] } = await res.json();
```

## Schema sync

When you change `content.config.ts`, the database schema is automatically synced.

| Change | Dev (`infernocms dev`) | Production (`infernocms start`) |
|--------|----------------------|--------------------------------|
| Add field | Column added | Column added |
| Remove field | Column dropped | Logged, skipped |
| Change type | Column altered | Logged, skipped |
| Add collection | Table created | Table created |
| Remove collection | Table dropped | Logged, skipped |

Dev mode applies all changes (including destructive ones) to keep the schema in sync. Production mode only applies safe (additive) changes and logs everything else.

## Deployment

### Development

```bash
npx infernocms dev
```

- Embedded PostgreSQL via PGlite (zero setup, data in `.infernocms/data/`)
- Local file storage in `./uploads/`
- Hot reload on config changes
- Types auto-generated on startup
- API at `localhost:4000`

CLI options: `--port`, `--config`, `--dry-run`

### Production

```bash
DATABASE_URL=postgres://user:pass@host:5432/db npx infernocms start
```

- Requires `DATABASE_URL` environment variable (full PostgreSQL)
- Optional S3/R2 storage (configure in `content.config.ts`)
- Only safe schema migrations are applied
- Port configurable via `--port` or `PORT` env var (default 4000)

CLI options: `--port`, `--config`, `--dry-run`

### Storage config

Uploads use local storage by default. To use S3 (or R2/MinIO):

```typescript
export default defineConfig({
  storage: {
    provider: 's3',           // 'local' (default) or 's3'
    bucket: 'my-bucket',
    region: 'us-east-1',
    endpoint: 'https://...',  // for R2/MinIO
    accessKeyId: '...',
    secretAccessKey: '...',
    publicUrl: 'https://cdn.example.com',
    prefix: 'uploads/',
  },
  // ...
});
```

## Project structure

### Monorepo

```
infernocms/
├── packages/
│   ├── core/           # Schema parser, database, API server, CLI, validation
│   └── next/           # @infernocms/next — typed client, webhook revalidation, image handling
```

### User project

```
your-project/
├── content.config.ts   # Content schema definition
├── .infernocms/
│   ├── data/           # PGlite database (dev only)
│   └── types.ts        # Generated TypeScript types
├── uploads/            # Local file uploads
└── package.json
```

## Tech stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM) |
| API | Fastify |
| Database (dev) | PGlite (embedded PostgreSQL) |
| Database (prod) | PostgreSQL |
| Database access | Raw SQL (no ORM) |
| File storage | Local filesystem / S3-compatible |
