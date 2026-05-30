# Configuration

InfernoCMS is configured through a `content.config.ts` file using the `defineConfig()` helper.

## Basic Structure

```typescript
import { defineConfig } from 'infernocms'

export default defineConfig({
  collections: { /* ... */ },
  blocks: { /* ... */ },
  storage: { /* ... */ },
  webhooks: [ /* ... */ ],
})
```

> Auth is no longer a config option. Token-first auth is always on. See [Authentication](/guide/auth) for the bootstrap flow and how to mint additional tokens.

## Top-Level Options

### `collections`

Define your content types. See [Collections](/guide/collections) for details.

### `blocks`

Define reusable typed block schemas for use in `blocks` fields. See [Collections](/guide/collections) for details on using blocks in your content.

```typescript
import { defineConfig, block, field } from 'infernocms'

export default defineConfig({
  blocks: {
    hero: block({
      fields: {
        heading: field.text({ required: true }),
        subheading: field.text(),
        image: field.image(),
      },
    }),
    richtext: block({
      fields: {
        content: field.richtext(),
      },
    }),
  },
  collections: {
    pages: {
      fields: {
        title: 'text!',
        blocks: field.blocks({ allowed: ['hero', 'richtext'] }),
      },
    },
  },
})
```

### `storage`

Configure file storage for uploaded media.

#### Local Storage (Default)

```typescript
export default defineConfig({
  storage: {
    provider: 'local',
    uploadDir: './uploads',
    publicUrl: '/uploads',
  },
})
```

#### S3-Compatible Storage

For AWS S3, Cloudflare R2, or other S3-compatible services:

```typescript
export default defineConfig({
  storage: {
    provider: 's3',
    bucket: 'my-bucket',
    region: 'us-east-1',
    endpoint: 'https://s3.us-east-1.amazonaws.com', // Optional
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    publicUrl: 'https://cdn.example.com',
    prefix: 'uploads/', // Optional path prefix
  },
})
```

**Cloudflare R2 Example:**

```typescript
storage: {
  provider: 's3',
  bucket: 'my-r2-bucket',
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  publicUrl: 'https://my-r2-bucket.example.com',
}
```

### Authentication

Auth is not configured here — it's always on. Tokens are managed at runtime via the `/api/_tokens` endpoint, not in config. See [Authentication](/guide/auth).

### `database` (optional)

By default, InfernoCMS uses [PGlite](https://pglite.dev/) — an embedded PostgreSQL that runs locally with zero setup. Data is stored in `.infernocms/data/`.

For production, point to a full PostgreSQL database:

```typescript
export default defineConfig({
  database: {
    provider: 'postgres',
    url: process.env.DATABASE_URL,
  },
})
```

No code changes required — PGlite and PostgreSQL use the same SQL dialect.

## Full Example

```typescript
import { defineConfig } from 'infernocms'

export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: 'text!',
        slug: 'slug:title',
        body: 'richtext',
        author: 'rel:authors',
        coverImage: 'image',
      },
    },
    authors: {
      fields: {
        name: 'text!',
        email: 'text!',
        bio: 'textarea',
      },
    },
  },
  storage: {
    provider: 's3',
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    publicUrl: process.env.CDN_URL,
    prefix: 'cms-uploads/',
  },
})
```
