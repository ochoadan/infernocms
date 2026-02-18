# Getting Started

Get up and running with InfernoCMS in 60 seconds.

## Prerequisites

- Node.js 18 or higher
- pnpm (recommended) or npm

## Installation

Install InfernoCMS in your project:

```bash
pnpm add infernocms
```

## Create Your First Config

Create a `content.config.ts` file in your project root:

```typescript
import { defineConfig } from 'infernocms'

export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: 'text!',
        slug: 'slug:title',
        body: 'richtext',
        status: 'select:draft,published',
      },
    },
  },
})
```

This creates a `posts` collection with:
- A required `title` field
- An auto-generated `slug` based on the title
- A `body` field with rich text editing
- A `status` field with draft/published options

## Start the Development Server

Run InfernoCMS in development mode:

```bash
npx infernocms dev
```

This will start:
- **API server** at `http://localhost:4000`
- **Admin UI** at `http://localhost:4001`

No database setup required — InfernoCMS uses [PGlite](https://pglite.dev/) (embedded PostgreSQL) by default for local development. Your data is stored in `.infernocms/data/`. The same code works with a full PostgreSQL database in production by setting `DATABASE_URL`.

## Test Your API

Open your browser to `http://localhost:4001` to access the admin UI, or test the API directly:

```bash
curl http://localhost:4000/api/posts
```

You should see an empty array `[]` since no posts have been created yet.

## Next Steps

- Learn about [Configuration](/guide/configuration) options
- Explore [Collections](/guide/collections) and field types
- Set up [Access Control](/guide/access-control)
- Add [Lifecycle Hooks](/guide/hooks)
