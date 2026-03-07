# InfernoCMS

A CMS that gets out of your way — define content in code, get an API and admin UI instantly.

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

API at `http://localhost:4000/api/posts`. Admin at `http://localhost:4001`.

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

| Type | Storage | Options |
|------|---------|---------|
| `text` | `TEXT` | `required`, `maxLength`, `default` |
| `textarea` | `TEXT` | `required`, `maxLength`, `default` |
| `number` | `INTEGER`/`REAL` | `required`, `integer`, `default` |
| `boolean` | `BOOLEAN` | `required`, `default` |
| `select` | `TEXT` | `required`, `options[]`, `default` |
| `datetime` | `TIMESTAMP` | `required`, `default` |
| `date` | `DATE` | `required`, `default` |
| `json` | `JSONB` | `required`, `default` |
| `richtext` | `JSONB` | `required` |
| `image` | `TEXT` (path/url) | `required`, `default` |
| `file` | `TEXT` (path/url) | `required`, `default` |
| `relation` | `INTEGER` (FK) | `required`, `collection`, `many` |
| `slug` | `TEXT UNIQUE` | `required`, `from`, `default` |
| `blocks` | `JSONB` | `required`, `allowed[]` |
| `link` | `JSONB` | `required` |
| `group` | `JSONB` | `required`, `fields` |
| `array` | `JSONB` | `required`, `fields` |

All fields also accept `silent: true` to hide from the admin form.

Every collection automatically gets `id` (auto-increment integer), `createdAt`, and `updatedAt` columns. Disable timestamps with `timestamps: false` on the collection.

## API

### Endpoints

Every collection gets these endpoints:

```
GET    /api/{collection}          # List items
GET    /api/{collection}/:id      # Get single item
POST   /api/{collection}          # Create item
PUT    /api/{collection}/:id      # Full update
PATCH  /api/{collection}/:id      # Partial update
DELETE /api/{collection}/:id      # Delete item
```

System endpoints:

```
GET    /api/_health               # Health check
GET    /api/_schema               # Schema introspection (used by admin UI)
POST   /api/_upload               # File upload (multipart, 10MB limit)
```

### Query parameters

```
?limit=10&offset=0               # Pagination (offset-based)
?page=2&perPage=10               # Pagination (page-based)
?sort=createdAt                  # Sort ascending
?sort=-createdAt                 # Sort descending (prefix -)
?fields=id,title,slug            # Field selection
?depth=1                         # Resolve relations (max 2)
?search=hello                    # Search across text/textarea fields
```

### Filter operators

Filters use query parameters with `_{operator}` suffix:

| Operator | Example | SQL |
|----------|---------|-----|
| `eq` (default) | `?status=published` | `= 'published'` |
| `ne` | `?status_ne=draft` | `!= 'draft'` |
| `gt` | `?price_gt=10` | `> 10` |
| `gte` | `?price_gte=10` | `>= 10` |
| `lt` | `?price_lt=100` | `< 100` |
| `lte` | `?price_lte=100` | `<= 100` |
| `contains` | `?title_contains=hello` | `ILIKE '%hello%'` |
| `startsWith` | `?title_startsWith=Hello` | `ILIKE 'Hello%'` |
| `endsWith` | `?title_endsWith=world` | `ILIKE '%world'` |
| `in` | `?status_in=draft,published` | `IN ('draft','published')` |

Multiple filters are combined with AND.

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

### Stored format

Blocks are stored as a JSONB array:

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

Disabled by default. All endpoints are publicly accessible unless auth is configured.

### Config

```typescript
export default defineConfig({
  auth: {
    adminSecret: 'your-admin-secret',  // Enables admin login + X-Admin-Key header auth
    secret: 'your-jwt-secret',         // Enables Bearer token (JWT HS256) auth
  },
  // ...
});
```

When auth is configured, write operations (create/update/delete) require authentication by default. Read operations remain public unless explicitly restricted with access rules.

### Auth methods

| Method | Header/Cookie | Use case |
|--------|--------------|----------|
| Admin key | `X-Admin-Key: {adminSecret}` | Server-to-server API calls |
| Bearer JWT | `Authorization: Bearer {token}` | App users (sign tokens with `secret`) |
| Session cookie | `infernocms-session` (httpOnly) | Admin UI login |

The admin UI authenticates via `POST /api/_auth/login` with `{ "key": "{adminSecret}" }`, which sets an httpOnly session cookie.

### Access control

Per-collection access rules:

```typescript
export default defineConfig({
  collections: {
    posts: {
      access: {
        read: () => true,                              // public
        create: ({ user }) => !!user,                   // any authenticated user
        update: ({ user, item }) =>
          user?.role === 'admin' || item.author === user?.id,
        delete: ({ user }) => user?.role === 'admin',
      },
      fields: { /* ... */ }
    }
  }
});
```

Access rules receive `{ user }` for read/create and `{ user, item }` for update/delete. Rules can be `boolean`, sync functions, or async functions.

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

## Admin UI

Auto-generated from the schema. No configuration needed.

### What it generates

- **Sidebar** — one entry per collection
- **List views** — sortable table with pagination, edit/delete actions
- **Create/edit forms** — fields auto-mapped to UI components (text inputs, toggles, date pickers, relation selectors, rich text editor via Plate, block editor, etc.)
- **Dashboard** — collection cards with quick actions

### Routes

```
/admin                             # Dashboard
/admin/collections/:name           # List view
/admin/collections/:name/new       # Create form
/admin/collections/:name/:id       # Edit form
/admin/settings                    # Settings
```

### Ports

- Dev: API on port 4000, Admin on port 4001 (launched together by `npx infernocms dev`)
- Production: Admin built as static assets, served by the API server or deployed separately

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
- API at `localhost:4000`, Admin at `localhost:4001`

CLI options: `--port`, `--admin-port`, `--config`, `--no-admin`, `--dry-run`

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
│   ├── core/           # Schema parser, database, API server, validation
│   ├── cli/            # CLI commands (dev, start, generate)
│   └── admin/          # Admin UI (Next.js 15)
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
| Config loader | jiti |
| CLI | cac |
| Admin | Next.js 15 + shadcn/ui |
| Rich text | Plate |
| File storage | Local filesystem / S3-compatible |
| Monorepo | pnpm workspaces |
