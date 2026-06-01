---
layout: home

hero:
  name: InfernoCMS
  text: A CMS built for APIs and LLMs.
  tagline: Define your content schema in TypeScript. Get a full REST API instantly — then build your own editor on top.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/ochoadan/infernocms

features:
  - title: Config-Driven Schema
    details: Define collections and fields in a single TypeScript config file. No migrations to write.
  - title: 17 Field Types
    details: Text, number, boolean, select, datetime, relation, slug, image, file, rich text, blocks, link, group, array, and more.
  - title: REST API
    details: Auto-generated CRUD endpoints with pagination, sorting, filtering, depth-resolved relations, and field selection.
  - title: Hooks, Webhooks, Access Control
    details: Lifecycle hooks for custom logic. Outbound webhooks on CRUD events. Per-collection, per-operation access rules.
  - title: Zero-Setup Dev Database
    details: PGlite (embedded PostgreSQL) runs locally with no install. Same code works with full Postgres in production via DATABASE_URL.
  - title: Storage Drivers
    details: Local filesystem for dev, S3-compatible (AWS S3, Cloudflare R2) for production.
---

## Status

`0.1.0` ships the headless API + schema engine as a single npm package.

> **No bundled editor — by design.** InfernoCMS gives you the infrastructure to build your own editing UI: token-based login, schema-defined editable fields, and full CRUD through the API (or driven by an LLM). It doesn't ship an editor or prescribe a UI stack — that part is yours.

```bash
npm install infernocms
```

```ts
// content.config.ts
import { defineConfig, field } from 'infernocms';

export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: field.text({ required: true }),
        slug: field.slug({ from: 'title' }),
        body: field.richtext(),
        author: field.relation({ collection: 'authors' }),
        status: field.select({ options: ['draft', 'published'], default: 'draft' }),
      },
    },
  },
});
```

```bash
npx infernocms dev
```

API at `http://localhost:4000/api/posts`. See [Getting Started](/guide/getting-started) for the full walkthrough.
