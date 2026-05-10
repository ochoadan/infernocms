# Architecture

> ⚠️ The "Admin UI" sections below describe the current preview implementation. Sub-project 3 (admin rebuild on shadcn preset) will replace it. Other sections track current behavior.

## System overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Your App                             │
│                    (Next.js, Remix, etc.)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      REST API Layer                         │
│              /api/{collection} endpoints                    │
│         Auto-generated from content.config.ts               │
│                    (Fastify, port 4000)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Core Engine                             │
│   ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│   │   Schema    │  │    Query     │  │   Validation    │   │
│   │   Parser    │  │   Builder    │  │     Engine      │   │
│   └─────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                            │
│        PGlite (default) │ PostgreSQL (production)          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Admin UI                                │
│           Next.js app consuming the REST API                │
│    Served by CLI in dev (port 4001) or embedded in prod     │
└─────────────────────────────────────────────────────────────┘
```

## The config file

Everything starts from `content.config.ts`:

```typescript
// content.config.ts
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
        status: field.select({
          options: ['draft', 'published'],
          default: 'draft'
        }),
        publishedAt: field.datetime(),
      }
    },

    authors: {
      fields: {
        name: field.text({ required: true }),
        email: field.text(),
        avatar: field.image(),
        bio: field.richtext(),
      }
    },

    tags: {
      fields: {
        name: field.text({ required: true }),
        slug: field.slug({ from: 'name' }),
      }
    },

    pages: {
      fields: {
        title: field.text({ required: true }),
        slug: field.slug({ from: 'title' }),
        blocks: field.blocks(),  // flexible content blocks
      }
    }
  },

  // Database is configured via environment variables or CLI flags:
  //   DATABASE_URL=postgres://user:pass@host:5432/db npx infernocms start
  // In development, PGlite is used automatically (embedded in .infernocms/data/).

  storage: {
    provider: 'local',         // or 's3'
    uploadDir: './uploads',
  },
});
```

### Shorthand syntax

For rapid prototyping, use string shorthand:

```typescript
export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: 'text!',           // ! = required
        slug: 'slug:title',       // slug from title field
        body: 'richtext',
        cover: 'image',
        author: 'rel:authors',    // relation to authors
        tags: 'rel:tags[]',       // [] = many
        status: 'select:draft,published',
        publishedAt: 'datetime',
      }
    }
  }
});
```

Both syntaxes are equivalent. Use verbose for complex configs, shorthand for simple ones.

## Field types

Fields marked with * are implemented. Unmarked fields are planned.

| Type | Storage | Status | Description |
|------|---------|--------|-------------|
| `text` | `TEXT` | * | Single-line text |
| `textarea` | `TEXT` | * | Multi-line text |
| `number` | `INTEGER/REAL` | * | Numeric value |
| `boolean` | `BOOLEAN` | * | True/false |
| `select` | `TEXT` | * | Single choice from options |
| `datetime` | `TIMESTAMP` | * | Date and time |
| `date` | `DATE` | * | Date only |
| `json` | `JSONB` | * | Arbitrary JSON |
| `richtext` | `JSONB` | * | Block-based rich content |
| `multiselect` | `JSONB` | Planned | Multiple choices |
| `image` | `TEXT` (path/url) | * | Image reference |
| `file` | `TEXT` (path/url) | * | File reference |
| `relation` | `INTEGER` (FK) | * | Reference to another collection |
| `slug` | `TEXT UNIQUE` | * | URL-safe identifier |
| `blocks` | `JSONB` | * | Flexible content blocks |
| `link` | `JSONB` | * | URL with label and target |
| `group` | `JSONB` | * | Nested field group |
| `array` | `JSONB` | * | Repeatable field group |

## Database schema

### Auto-generated tables

Each collection becomes a table. IDs are auto-incrementing integers:

```sql
-- Generated for 'posts' collection
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  excerpt TEXT,
  body JSONB,                    -- JSONB for richtext
  cover TEXT,                    -- file path or URL
  author INTEGER REFERENCES authors(id),
  status TEXT DEFAULT 'draft',
  "publishedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for many-to-many (posts <-> tags)
CREATE TABLE posts_tags (
  posts_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tags_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  "sortOrder" INTEGER DEFAULT 0,
  PRIMARY KEY (posts_id, tags_id)
);

-- Index for common queries
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_author ON posts(author);
```

### Schema sync behavior

When you change `content.config.ts`:

| Change | Dev mode (`force: true`) | Production (`force: false`) |
|--------|--------------------------|-------------------------------|
| Add field | Column added (safe) | Column added (safe) |
| Remove field | Column dropped (destructive) | Logged, skipped |
| Rename field | Treated as remove + add | Treated as remove + add |
| Change field type | Column altered (destructive) | Logged, skipped |
| Add collection | Table created (safe) | Table created (safe) |
| Remove collection | Table dropped (destructive) | Logged, skipped |

In production, destructive operations are logged but not executed unless explicitly forced. In dev mode, all operations execute to keep the schema in sync with the config.

## API design

### Endpoints

Every collection gets these endpoints:

```
GET    /api/{collection}          # List items
GET    /api/{collection}/:id      # Get single item
POST   /api/{collection}          # Create item
PUT    /api/{collection}/:id      # Update item (full replace)
PATCH  /api/{collection}/:id      # Update item (partial)
DELETE /api/{collection}/:id      # Delete item
```

Additionally, a schema introspection endpoint:

```
GET    /api/_schema               # Returns full schema definition
```

### Query parameters

```bash
# Pagination
GET /api/posts?limit=10&offset=0
GET /api/posts?page=2&perPage=10

# Sorting
GET /api/posts?sort=createdAt       # ascending
GET /api/posts?sort=-createdAt      # descending (prefix -)

# Filtering
GET /api/posts?status=published
GET /api/posts?author=5
GET /api/posts?status=published&author=5  # AND

# Relations (depth)
GET /api/posts?depth=1              # include author object
GET /api/posts?depth=2              # include author and their relations

# Field selection
GET /api/posts?fields=id,title,slug
```

### Response format

```json
// List response — GET /api/posts
{
  "data": [
    { "id": 1, "title": "Hello", "status": "published" },
    { "id": 2, "title": "World", "status": "draft" }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "perPage": 10,
    "totalPages": 5
  }
}

// Single item response — GET /api/posts/1
{
  "data": {
    "id": 1,
    "title": "Hello",
    "author": 5,              // depth=0: just ID (integer)
    "createdAt": "2026-01-22T10:00:00.000Z",
    "updatedAt": "2026-01-22T10:00:00.000Z"
  }
}

// With depth=1:
{
  "data": {
    "id": 1,
    "title": "Hello",
    "author": {
      "id": 5,
      "name": "Jane",
      "avatar": "/uploads/jane.jpg"
    }
  }
}

// Error response
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

## Admin UI

### Architecture

The admin is a **separate Next.js application** that consumes the REST API. In development, the CLI orchestrates both processes:

- **API server**: Fastify on port 4000
- **Admin UI**: Next.js on port 4001

In production, the admin can be:
- Built as static assets and served by the API server
- Deployed separately (e.g., Vercel) pointing at the API URL
- Disabled entirely for headless-only use

The admin communicates with the API over HTTP (CORS is enabled by default).

### Auto-generated from schema

The admin reads the schema from `GET /api/_schema` and generates:

1. **Sidebar navigation** — One item per collection
2. **List views** — Table with sortable columns, pagination, edit/delete actions
3. **Edit forms** — Fields generated from schema

### Field → Component mapping

| Field type | Admin component |
|------------|-----------------|
| `text` | Text input |
| `textarea` | Textarea |
| `richtext` | Block editor (Plate) |
| `number` | Number input |
| `boolean` | Toggle switch |
| `datetime` | Date-time picker |
| `date` | Date picker |
| `select` | Dropdown |
| `multiselect` | Multi-select dropdown — planned |
| `image` | Image picker + upload |
| `file` | File picker + upload |
| `relation` | Searchable select / modal picker |
| `slug` | Text input with auto-generate toggle |
| `blocks` | Block editor with picker |
| `json` | JSON editor |
| `link` | URL + label + target fields |
| `group` | Nested field group |
| `array` | Repeatable item list |

### Admin routes

```
/admin
├── /                           # Dashboard (collection cards, quick actions)
├── /collections/:name          # List view
├── /collections/:name/new      # Create form
├── /collections/:name/:id      # Edit form
├── /settings                   # CMS settings
└── /media                      # Media library (planned)
```

Built with:
- **Next.js 15 App Router** — Server components for initial load
- **shadcn/ui** — Component library
- **Custom data table** — Sortable, paginated, searchable
- **Plate** — Rich text / block editor

## File structure

```
your-project/
├── content.config.ts           # Content schema definition
├── .infernocms/
│   ├── data/                   # PGlite database (dev)
│   ├── schema.json             # Compiled schema cache
│   └── types.ts                # Generated TypeScript types
├── uploads/                    # Local file uploads
└── node_modules/
    └── infernocms/
        ├── core/               # Core engine
        │   ├── schema/         # Schema parser + field definitions
        │   ├── config/         # Config loader + types
        │   ├── database/       # Database connection, migration, repository
        │   ├── api/            # Server, routes, handlers, response helpers
        │   └── validation.ts   # Validation engine
        ├── admin/              # Admin UI (Next.js app)
        └── cli/                # CLI commands
```

## Blocks system

For flexible page content:

```typescript
// content.config.ts
import { defineConfig, field } from 'infernocms';

export default defineConfig({
  blocks: {
    hero: {
      fields: {
        heading: field.text({ required: true }),
        subheading: field.text(),
        image: field.image(),
        cta: field.text(),
        ctaLink: field.text(),
      }
    },

    richtext: {
      fields: {
        content: field.richtext(),
      }
    },

    gallery: {
      fields: {
        columns: field.select({ options: ['2', '3', '4'], default: '3' }),
      }
    },

    cta: {
      fields: {
        heading: field.text(),
        description: field.text(),
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
        blocks: field.blocks({
          allowed: ['hero', 'richtext', 'gallery', 'cta']
        }),
      }
    }
  }
});
```

Blocks stored as JSON array:

```json
{
  "blocks": [
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
      "content": [/* Plate JSON */]
    }
  ]
}
```

## Authentication

Token-first bearer auth. Every request — admin UI, LLM pipeline, curl — sends `Authorization: Bearer <token>`. Tokens are first-class records in `_infernocms_tokens` with three scopes (`read` / `write` / `admin`), revocable from the admin UI, hashed at rest with `sha256`.

The bootstrap admin token is set via the `INFERNOCMS_BOOTSTRAP_TOKEN` environment variable (used by Inferno Cloud during provisioning) or generated on first start, printed to stdout, and appended to `.env` if present.

There is no "no auth" mode at the request layer — the middleware always runs. Public read access is expressed at the collection level via `access.read`. Full design: [auth spec](docs/superpowers/specs/2026-05-08-cms-auth-design.md).

Access control per collection:

```typescript
export default defineConfig({
  collections: {
    posts: {
      access: {
        read: () => true,                          // public
        create: ({ user }) => !!user,              // logged in
        update: ({ user, item }) =>
          user?.role === 'admin' || item.author === user?.id,
        delete: ({ user }) => user?.role === 'admin',
      },
      fields: { /* ... */ }
    }
  }
});
```

## Hooks (optional)

```typescript
export default defineConfig({
  collections: {
    posts: {
      hooks: {
        beforeCreate: async ({ data, user }) => {
          data.author = user.id;
          return data;
        },
        afterCreate: async ({ item }) => {
          await sendNotification(item);
        },
        beforeUpdate: async ({ data, existing }) => {
          if (data.status === 'published' && !existing.publishedAt) {
            data.publishedAt = new Date().toISOString();
          }
          return data;
        },
      },
      fields: { /* ... */ }
    }
  }
});
```

## Type generation

Auto-generates TypeScript types from the config (regenerated on every dev hot-reload):

```typescript
// .infernocms/types.ts (auto-generated, do not edit)

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  body?: RichTextContent;
  cover?: string;
  author?: number | Author;  // number at depth=0, Author at depth=1
  tags?: number[] | Tag[];
  status: 'draft' | 'published';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Author {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
  bio?: RichTextContent;
  createdAt: string;
  updatedAt: string;
}

// ... etc
```

Import in your app:

```typescript
import type { Post, Author } from './.infernocms/types';

const response = await fetch('/api/posts');
const { data: posts }: { data: Post[] } = await response.json();
```

## Deployment modes

### Development (default)

```bash
npx infernocms dev
```

- PGlite database (embedded PostgreSQL)
- Local file storage
- Hot reload on config changes
- API at `localhost:4000/api`
- Admin at `localhost:4001/admin` (started automatically by CLI)

### Production (self-hosted)

```bash
# Using environment variable for PostgreSQL
DATABASE_URL=postgres://user:pass@host:5432/db npx infernocms start

# Or with Docker
docker run -e DATABASE_URL=postgres://... infernocms/infernocms
```

- Full PostgreSQL (same code, just different connection)
- S3/R2 for file storage
- Admin built as static assets, served by the API server
- Run as Node.js server or Docker container

### Production (managed — future)

```bash
npx infernocms deploy
```

- Hosted PostgreSQL
- Hosted file storage
- CDN for assets
- Automatic backups
