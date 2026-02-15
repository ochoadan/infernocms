# Architecture

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
        author: field.relation({ to: 'authors' }),
        tags: field.relation({ to: 'tags', many: true }),
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

  // Optional: override defaults
  database: {
    provider: 'pglite',        // or 'postgres'
    url: './.infernocms/data', // or process.env.DATABASE_URL for postgres
  },

  storage: {
    provider: 'local',         // or 's3', 'r2'
    path: './uploads',
  },

  admin: {
    enabled: true,
    path: '/admin',
  }
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
| `richtext` | `JSONB` | Planned | Block-based rich content |
| `multiselect` | `JSONB` | Planned | Multiple choices |
| `image` | `TEXT` (path/url) | Planned | Image reference |
| `file` | `TEXT` (path/url) | Planned | File reference |
| `relation` | `INTEGER` (FK) | Planned | Reference to another collection |
| `slug` | `TEXT UNIQUE` | Planned | URL-safe identifier |
| `blocks` | `JSONB` | Planned | Flexible content blocks |

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
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (post_id, tag_id)
);

-- Index for common queries
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_author ON posts(author);
```

### Schema sync behavior

When you change `content.config.ts`:

| Change | Behavior |
|--------|----------|
| Add field | Column added with NULL default |
| Remove field | Column kept (data preserved), hidden from API |
| Rename field | Treated as remove + add (use migration for data) |
| Change field type | Error (use explicit migration) |
| Add collection | Table created |
| Remove collection | Table kept, hidden from API |

**Principle:** Never auto-delete data. Schema changes are additive by default.

### Explicit migrations

For destructive changes (renaming fields, changing types, dropping data):

```bash
npx infernocms migrate:generate rename-field
npx infernocms migrate:run
```

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

# Relations (depth) — planned
GET /api/posts?depth=1              # include author object
GET /api/posts?depth=2              # include author and their relations

# Field selection — planned
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

// With depth=1 (planned):
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
    "message": "Title is required",
    "details": {
      "field": "title",
      "rule": "required"
    }
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
| `richtext` | Block editor (Plate) — planned |
| `number` | Number input |
| `boolean` | Toggle switch |
| `datetime` | Date-time picker |
| `date` | Date picker |
| `select` | Dropdown |
| `multiselect` | Multi-select dropdown — planned |
| `image` | Image picker + upload — planned |
| `file` | File picker + upload — planned |
| `relation` | Searchable select / modal picker — planned |
| `blocks` | Block editor with picker — planned |
| `json` | JSON editor |

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
- **React Hook Form** — Form state management
- **shadcn/ui** — Component library
- **TanStack Table** — Data tables
- **Plate** — Rich text / block editor (planned)

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

## Blocks system (planned)

For flexible page content:

```typescript
// content.config.ts
import { defineConfig, field, block } from 'infernocms';

export default defineConfig({
  blocks: {
    hero: block({
      fields: {
        heading: field.text({ required: true }),
        subheading: field.text(),
        image: field.image(),
        cta: field.text(),
        ctaLink: field.text(),
      }
    }),

    richtext: block({
      fields: {
        content: field.richtext(),
      }
    }),

    gallery: block({
      fields: {
        images: field.image({ many: true }),
        columns: field.select({ options: ['2', '3', '4'], default: '3' }),
      }
    }),

    cta: block({
      fields: {
        heading: field.text(),
        description: field.text(),
        buttonText: field.text(),
        buttonLink: field.text(),
        variant: field.select({ options: ['default', 'dark'], default: 'default' }),
      }
    }),
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

## Authentication (planned, optional)

Disabled by default. Enable with:

```typescript
// Option A: Local email/password auth
export default defineConfig({
  auth: {
    enabled: true,
    provider: 'local',  // email/password
  },
  // ...
});

// Option B: OAuth providers
export default defineConfig({
  auth: {
    enabled: true,
    provider: 'oauth',
    providers: ['google', 'github'],
  },
  // ...
});
```

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

## Hooks (planned, optional)

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

## Type generation (planned)

Auto-generates TypeScript types:

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
