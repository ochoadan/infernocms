# Vision

## One sentence

A CMS that gets out of your way — define content in code, get an API and UI instantly.

## The problem we solve

Every CMS makes you choose: **simple but rigid** (Ghost, WordPress) or **flexible but complex** (Strapi, Payload, Contentful).

Developers waste hours on CMS setup, config, and fighting abstractions. Content teams wait for developers to make schema changes. Everyone loses.

## What we are

**A code-first content layer that expands with your application.**

You define content types in a simple config. The system generates:
- REST API endpoints (instant, no setup)
- Admin UI (forms auto-generated from schema)
- TypeScript types (full type safety)

When you add a field to your config, the system expands. No UI to click through. No deploy to trigger. Additive schema changes happen automatically — destructive changes (renaming, type changes) use explicit migrations so you never lose data by accident.

```typescript
// content.config.ts — this is the entire setup for a blog
import { defineConfig, field } from 'infernocms';

export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: field.text({ required: true }),
        body: field.richtext(),
        cover: field.image(),
        published: field.boolean(),
      }
    }
  }
});
```

Run `npx infernocms dev`. You now have `/api/posts` and an admin at `/admin`.

## What we are NOT

| We are NOT | Because |
|------------|---------|
| A page builder | We manage content, not layouts |
| A full website solution | We're headless-first (with optional preview) |
| An enterprise platform | Simple > feature-complete |
| A database replacement | We're a content layer on top of your database |
| A framework | We're a tool that plugs into any stack |

## Core principles

### 1. Zero to content in 60 seconds

First-time experience matters more than advanced features. A developer should go from `npm install` to creating their first content item in under a minute.

**Implication:** No mandatory config files, no required environment variables, no database setup for local dev. PGlite (embedded PostgreSQL) by default, same code works with full Postgres in production.

### 2. Code is the source of truth

Content schemas live in your codebase, version-controlled, reviewable, deployable. The UI reflects code, not the other way around.

**Implication:** No clicking through admin panels to define fields. No exporting/importing schemas. Change code → system adapts.

### 3. The API is the product

Everything else (admin UI, types, validation) exists to serve the API. The API should be so simple that any developer (or AI agent) can use it without reading docs.

**Implication:**
- `GET /api/posts` — list posts
- `GET /api/posts/:id` — get one post
- `POST /api/posts` — create post
- `PUT /api/posts/:id` — update post
- `DELETE /api/posts/:id` — delete post

That's it. No query languages. No special syntax. Just REST.

### 4. Sensible defaults, escape hatches when needed

Works perfectly with zero config. But when you need customization, it's there — not hidden behind enterprise tiers.

**Implication:**
- Default: PGlite (embedded Postgres), local file storage, no auth
- Opt-in: Full Postgres, S3/R2, JWT auth, webhooks

### 5. AI-friendly by design

LLMs and AI agents are first-class consumers. The simple, predictable REST API is trivially callable by any AI system — no SDKs, no auth ceremony, no query language to learn.

**Implication:**
- Simple, predictable endpoints
- Clear error messages
- Consistent response format across all collections

## Who this is for

**Primary: Solo developers and small teams** who need content management without the overhead. Building a SaaS? Need a blog, changelog, docs, or help center? This handles it.

**Secondary: Agencies** spinning up client sites. One config file, deploy, hand off the admin to the client.

**Tertiary: AI developers** building apps that need structured content storage with simple API access.

## Who this is NOT for

- Enterprise teams needing workflow approvals, audit logs, compliance
- Marketing teams wanting visual page builders
- Anyone needing real-time collaboration (Google Docs style)

We're not trying to serve everyone. We're trying to be the best for our core users.

## Success metrics

1. **Time to first content item**: < 60 seconds
2. **Lines of config for a blog**: < 20
3. **API response time**: < 50ms p95
4. **Learning curve**: Use it correctly on first try without reading docs

## The name

**InfernoCMS** — fast, fiery, gets out of your way.

## North star

**Ghost's simplicity. Payload's flexibility. Zero learning curve.**

When someone asks "what CMS should I use for my project?", we want the answer to be obvious: "Just use InfernoCMS. It takes 5 minutes."
