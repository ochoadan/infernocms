# Storage

InfernoCMS handles file uploads (images, documents, anything via `field.file()`) through a pluggable storage driver. Two drivers ship with `0.1.0`: **local filesystem** and **S3-compatible** (AWS S3, Cloudflare R2, MinIO, etc.).

Storage is configured via the top-level `storage` key in `content.config.ts`. If omitted, uploads are disabled and the `POST /api/_upload` endpoint will return an error.

## Local storage

Default for development. Files are written to a directory on disk and served back via the `/uploads/*` URL path.

```ts
import { defineConfig } from 'infernocms';

export default defineConfig({
  storage: {
    provider: 'local',
    uploadDir: './uploads',  // optional, defaults to ./uploads
  },
  collections: { /* ... */ },
});
```

Uploaded files are stored as `<timestamp>_<sanitized-filename>` inside `uploadDir` and returned to clients as `/uploads/<filename>`.

::: warning Production note
Local storage is fine for development and single-server deploys. For anything horizontally scaled or behind a CDN, use S3 storage instead.
:::

## S3-compatible storage

Works with AWS S3, Cloudflare R2, Backblaze B2, MinIO, and any other S3-API provider.

```ts
import { defineConfig } from 'infernocms';

export default defineConfig({
  storage: {
    provider: 's3',
    bucket: 'my-cms-bucket',
    region: 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    publicUrl: 'https://cdn.example.com',  // optional
    prefix: 'uploads/',                     // optional
    endpoint: undefined,                    // required for non-AWS providers
  },
  collections: { /* ... */ },
});
```

### Options

| Option | Required | Description |
|---|---|---|
| `provider` | yes | Set to `'s3'`. |
| `bucket` | yes | Bucket name. |
| `accessKeyId` | yes | Access key. **Use environment variables.** |
| `secretAccessKey` | yes | Secret key. **Use environment variables.** |
| `region` | no | AWS region. Defaults to `'auto'`; falls back to `'us-east-1'` when constructing the public URL if no `publicUrl` is set. |
| `endpoint` | no | Custom endpoint URL. **Required for non-AWS providers** like Cloudflare R2 or MinIO. When set, requests use path-style addressing. |
| `publicUrl` | no | Base URL returned to clients (e.g. a CDN domain). When unset, falls back to the AWS virtual-hosted URL `https://<bucket>.s3.<region>.amazonaws.com`. |
| `prefix` | no | Key prefix for all uploads. Defaults to `'uploads/'`. |

### Cloudflare R2 example

```ts
storage: {
  provider: 's3',
  bucket: 'my-cms-bucket',
  endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  publicUrl: 'https://media.example.com', // your R2 public bucket URL
}
```

### AWS S3 example

```ts
storage: {
  provider: 's3',
  bucket: 'my-cms-bucket',
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
}
```

## How uploads work

1. Client `POST`s a multipart form to `/api/_upload`.
2. The driver writes the file with a unique name (`<timestamp>_<sanitized-filename>`).
3. The endpoint returns `{ data: { url, filename, ext } }`.
4. The returned `url` is what you store in `image` / `file` fields.

The URL format depends on the driver:

| Driver | URL format |
|---|---|
| `local` | `/uploads/<filename>` (relative, served by the API) |
| `s3` (with `publicUrl`) | `<publicUrl>/<prefix><filename>` |
| `s3` (without `publicUrl`) | `https://<bucket>.s3.<region>.amazonaws.com/<prefix><filename>` |

## Filename sanitization

Both drivers apply the same sanitization to incoming filenames:

```
<Date.now()>_<replaced filename>
```

Where the original filename has every character outside `[a-zA-Z0-9._-]` replaced with `_`. This avoids path traversal and special-character issues.

## Deleting files

Files are deleted automatically when the parent record is deleted (via the `image` / `file` field cleanup). For S3, deletes are scoped to the configured `prefix` and reject any path containing `..` to prevent escaping.

## What's not in 0.1.0

- Image transforms / variants (resize, crop, format conversion)
- Multipart/streamed uploads of very large files
- Presigned upload URLs (clients always upload through the API)

These are tracked for future releases.
