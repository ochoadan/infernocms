# Roadmap

## Philosophy

Ship fast. Learn from users. Iterate.

Each phase delivers something usable. Don't wait for "complete" — complete is the enemy of shipped.

---

## Phase 0: Proof of Concept ✅

**Goal:** Prove the core loop works. Config → Database → API.

### Deliverables

- [x] Read a `content.config.ts` file
- [x] Create PostgreSQL tables from schema (via PGlite)
- [x] Generate CRUD endpoints (8 core field types: text, textarea, number, boolean, select, datetime, date, json)
- [x] Return JSON responses with pagination, sorting, filtering

### Implementation (COMPLETED)

```
Schema parser
- Parse config file with jiti
- Extract collections and fields
- Map field types to PostgreSQL types
- Support shorthand string syntax ('text!', 'textarea', etc.)

Database layer
- PGlite (embedded PostgreSQL) with Drizzle ORM
- Create tables dynamically from config
- Full CRUD operations with pagination, sorting, filtering
- Auto-generated id, createdAt, updatedAt columns

API layer
- Fastify server on port 4000
- Route generation per collection (GET, POST, PUT, PATCH, DELETE)
- Schema introspection endpoint (GET /api/_schema)
- CORS enabled for admin UI
- Tested with curl

Admin UI (basic)
- Next.js 15 app on port 4001
- Dashboard with collection cards
- List views with pagination and edit/delete actions
- Dynamic create/edit forms generated from schema
- Sidebar navigation
```

### Success criteria (VERIFIED)

```bash
# All working:
curl http://localhost:4000/api/posts
curl -X POST http://localhost:4000/api/posts -H "Content-Type: application/json" -d '{"title":"Hello"}'
curl http://localhost:4000/api/posts/1
curl -X PATCH http://localhost:4000/api/posts/1 -H "Content-Type: application/json" -d '{"status":"published"}'
curl -X DELETE http://localhost:4000/api/posts/1
```

### What was intentionally skipped

- Validation beyond type coercion
- Relations (just store IDs as integers, no resolution)
- File/image uploads (just store paths as text)
- Rich text editing (store as JSON, no editor)
- Auth (everything public)
- Unique constraints (slugs, etc.)
- CLI orchestration of admin + API together

---

## Phase 1: Usable MVP (Weeks 1-3)

**Goal:** A developer can actually use this for a real project.

### Deliverables

- [ ] Relations working (single + many-to-many)
- [ ] Image/file upload (local storage)
- [ ] Slug field type with auto-generation
- [ ] Validation (required, type checking, error display)
- [ ] CLI starts both API and admin together
- [ ] Admin UI polish (loading states, error handling, relation pickers)

### Week 1: Relations + Slugs

```
Day 1-2: Relation field type
- field.relation() and 'rel:collection' shorthand
- Single relation → INTEGER REFERENCES
- Many relation → junction table
- Admin: searchable dropdown for single, multi-select for many

Day 3-4: Slug field type
- field.slug({ from: 'title' })
- Auto-generate URL-safe slug from source field
- UNIQUE constraint on slug column
- Handle duplicates (append -1, -2, etc.)

Day 5: CLI unification
- `npx infernocms dev` starts both API (4000) and admin (4001)
- Single command, single terminal
- Clean shutdown of both processes
```

### Week 2: Uploads + Validation

```
Day 1-2: File/image uploads
- Upload endpoint (POST /api/_upload)
- Local storage in ./uploads
- Image field component with preview in admin
- File field component with download link

Day 3-4: Validation engine
- Required fields
- Type validation (number, boolean, datetime)
- maxLength for text fields
- Error display in admin forms
- API returns structured validation errors

Day 5: Buffer / bug fixes
```

### Week 3: Admin polish + depth queries

```
Day 1-2: Relation display in admin
- Show related item names (not just IDs) in list views
- Relation picker in forms (searchable dropdown)

Day 3-4: Depth query parameter
- ?depth=1 resolves relation IDs to full objects
- ?depth=2 resolves nested relations
- Works on both list and single-item endpoints

Day 5: Buffer / bug fixes / testing
```

### Success criteria

A developer can:
1. `npm install infernocms`
2. Create `content.config.ts` with posts + authors (using relations)
3. `npx infernocms dev`
4. Open admin, create an author, create a post linked to that author
5. Fetch via `GET /api/posts?depth=1` and see the author object embedded

---

## Phase 2: Production Ready (Weeks 4-6)

**Goal:** Can deploy to production with confidence.

### Deliverables

- [ ] Full PostgreSQL support (switch via DATABASE_URL)
- [ ] S3/R2 file storage
- [ ] Rich text editor (Plate)
- [ ] Blocks field type
- [ ] Type generation (.infernocms/types.ts)

### Week 4: Production database + storage

```
Day 1-2: PostgreSQL connection
- Detect DATABASE_URL environment variable
- Switch from PGlite to pg/postgres.js driver
- Same Drizzle ORM code works with both
- Connection pooling for production

Day 3-4: Cloud storage
- S3-compatible upload (AWS S3, Cloudflare R2)
- Storage provider config in content.config.ts
- Image variants (thumbnail generation)

Day 5: Type generation
- Generate .infernocms/types.ts from config
- Watch mode in dev (regenerate on config change)
- All IDs as number, relations as number | RelatedType
```

### Week 5: Rich content

```
Day 1-3: Plate integration
- Rich text field component in admin
- Basic toolbar (bold, italic, links, headings, lists)
- Serialize to JSON for storage in JSONB column

Day 4-5: Blocks field
- Block picker UI
- Drag-drop reordering
- 4 starter blocks: hero, richtext, image, cta
```

### Week 6: Buffer + integration testing

```
Day 1-3: End-to-end testing
- Deploy to Railway/Fly with Postgres
- Test all field types in production
- Test file uploads with S3/R2

Day 4-5: Bug fixes, edge cases, polish
```

### Success criteria

- Deploy to Railway/Fly with Postgres
- Create a page with multiple content blocks
- Import generated types into a Next.js frontend
- Images served from R2/S3

---

## Phase 3: Developer Experience (Weeks 7-9)

**Goal:** Delightful to use. People tell their friends.

### Deliverables

- [ ] Draft/published status workflow
- [ ] Hooks system (before/after CRUD)
- [ ] Access control (per-collection permissions)
- [ ] API filtering improvements (field selection, advanced filters)
- [ ] Documentation site

### Week 7: Content workflow

```
Day 1-2: Status + scheduling
- Draft/published toggle in admin
- publishedAt field auto-set on publish
- Filter by status in API (?status=published)

Day 3-5: Hooks
- beforeCreate, afterCreate
- beforeUpdate, afterUpdate
- beforeDelete, afterDelete
- Async hook support
```

### Week 8: Access + API improvements

```
Day 1-2: Access control
- Per-collection access rules (read/create/update/delete)
- User context passed to access functions
- Optional JWT auth middleware

Day 3-5: API improvements
- Field selection (?fields=id,title,slug)
- Advanced filtering (?title_contains=hello)
- Full-text search (Postgres tsvector)
```

### Week 9: Documentation

```
Day 1-3: Documentation site
- Getting started guide
- API reference
- Field types reference
- Config reference

Day 4-5: Deploy guides
- Railway
- Fly.io
- Docker
- Vercel (admin only, API elsewhere)
```

### Success criteria

- Non-technical user can create draft, preview, publish
- Developer can restrict API access to authenticated users
- Docs site live with examples

---

## Phase 4: Growth Features (Weeks 10-12)

**Goal:** Features that help adoption and differentiation.

### Deliverables

- [ ] Webhooks (on create/update/delete)
- [ ] Import/export (JSON, migrate from Strapi/Contentful)
- [ ] CLI improvements (init wizard, scaffolding)
- [ ] Localization support
- [ ] AI content generation endpoint (optional)

### Week 10: Webhooks + import/export

```
Day 1-2: Webhooks
- Configurable webhook URLs per event
- Retry logic with exponential backoff
- Webhook management in admin settings

Day 3-5: Import/export
- Export collection to JSON
- Import from JSON
- Basic Strapi/Contentful migration scripts
```

### Week 11: CLI + i18n

```
Day 1-2: CLI improvements
- `infernocms init` wizard (create config interactively)
- `infernocms add collection` scaffolding
- `infernocms generate types` manual type generation

Day 3-5: Localization
- locales config option
- Separate translations stored in JSONB (not field suffixes)
- Admin locale switcher
- API: ?locale=en query parameter
```

### Week 12: AI + polish

```
Day 1-3: AI endpoints (optional)
- POST /api/{collection}/generate
- Configurable LLM provider
- Generate from prompt or existing content
- Opt-in via config

Day 4-5: Polish, bug fixes, release prep
```

---

## Future (Post-MVP)

Prioritize based on user feedback:

| Feature | Complexity | Value |
|---------|------------|-------|
| Version history | Medium | High |
| Visual preview | Medium | High |
| GraphQL API | Medium | Medium |
| Multi-tenancy | High | High (for SaaS) |
| Real-time collaboration | High | Medium |
| Custom field plugins | High | Medium |
| Workflow approvals | Medium | Low (enterprise) |
| SSO/SAML | Medium | Low (enterprise) |
| Audit logs | Low | Low (enterprise) |

---

## Tech Stack (Locked)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Runtime | Node.js (ESM) | JS ecosystem, team familiarity |
| API framework | Fastify | 3x faster than Express, good DX |
| Database (dev) | PGlite | Zero setup, real PostgreSQL syntax |
| Database (prod) | PostgreSQL | Same code, just change connection |
| ORM | Drizzle | TypeScript-native, no codegen |
| Config loader | jiti | Load TypeScript configs directly |
| CLI | cac | Lightweight CLI framework |
| Admin framework | Next.js 15 | React ecosystem, can self-host |
| Admin components | shadcn/ui | Copy-paste, customizable |
| Admin tables | TanStack Table | Headless, flexible |
| Rich text | Plate | Best block-based editor |
| File storage | Local / S3 / R2 | Flexible, cost-effective |
| Package manager | pnpm | Fast, disk efficient |
| Monorepo | pnpm workspaces | Simple, built-in |

---

## Development Principles

### 1. Vertical slices over horizontal layers

Bad: "Build the entire database layer, then the entire API layer, then the entire admin"

Good: "Build posts end-to-end (DB → API → Admin), then add authors end-to-end"

### 2. Ship ugly, then polish

The first version of everything should be embarrassingly simple. Iterate based on real usage, not imagined requirements.

### 3. Delete code freely

If a feature isn't used or adds complexity without proportional value, remove it. Less code = less bugs = faster development.

### 4. Write for the next developer

Code should be readable without comments. Names should be obvious. Files should be small and focused.

### 5. Test the happy path

Don't write tests for edge cases until they matter. Focus on: "Does the main flow work?"

---

## Launch Checklist

Before announcing:

- [ ] Landing page with clear value prop
- [ ] Getting started guide (< 5 min read)
- [ ] Example project (blog with posts, authors, pages)
- [ ] Deploy guide for one platform (Railway or Fly)
- [ ] npm package published
- [ ] GitHub repo public with README
- [ ] Demo video (< 2 min)

Launch channels:
1. Hacker News ("Show HN: I built a CMS in X lines")
2. Twitter/X thread
3. Reddit (r/webdev, r/nextjs, r/javascript)
4. Dev.to blog post
5. Product Hunt (after initial feedback)

---

## Metrics to Track

### Usage
- npm downloads / week
- GitHub stars
- Active projects (via optional telemetry)

### Quality
- Time to first content item
- API response times
- Error rates

### Growth
- Referral source (how did you hear about us?)
- Feature requests (what's missing?)
- Churn reasons (why did you stop using it?)

---

## Decision Log

Track major decisions here:

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-22 | PGlite for dev, Postgres for prod | Zero-config + real PostgreSQL syntax in dev, same code in prod |
| 2026-01-22 | Fastify over Express | Performance, built-in schema validation |
| 2026-01-22 | Drizzle over Prisma | True TypeScript-first, no codegen step |
| 2026-01-22 | jiti for config loading | Load TypeScript configs without build step |
| 2026-01-22 | cac for CLI | Lightweight, good TypeScript support |
| 2026-01-22 | Integer auto-increment IDs | Simple, works with PGlite and Postgres, no UUID complexity |
| 2026-01-22 | Admin as separate Next.js app | Decoupled from API, can be deployed independently or embedded |
| 2026-02-10 | JSONB for localization (not field suffixes) | Avoids schema explosion, no migration per locale, cleaner queries |
| TBD | Plate over TipTap | Better block-based editing out of box |
| TBD | shadcn/ui over Radix directly | Faster to build, copy-paste customization |
