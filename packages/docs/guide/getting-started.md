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

This will start the **API server** at `http://localhost:4000`.

::: info Admin UI in 0.1.0
The admin UI is **preview-only** in this release. When you `npm install infernocms`, the CLI will print a notice that the admin isn't bundled — this is expected. To try the admin preview, clone the [monorepo](https://github.com/ochoadan/infernocms) and run `pnpm dev`. A published admin package (`@infernocms/admin`) is targeted for `0.2.0`.
:::

No database setup required — InfernoCMS uses [PGlite](https://pglite.dev/) (embedded PostgreSQL) by default for local development. Your data is stored in `.infernocms/data/`. The same code works with a full PostgreSQL database in production by setting `DATABASE_URL`.

## Test Your API

Hit the API directly:

```bash
curl http://localhost:4000/api/posts
```

You should see an empty array `[]` since no posts have been created yet.

## Next Steps

- Learn about [Configuration](/guide/configuration) options
- Explore [Collections](/guide/collections) and field types
- Set up [Access Control](/guide/access-control)
- Add [Lifecycle Hooks](/guide/hooks)
