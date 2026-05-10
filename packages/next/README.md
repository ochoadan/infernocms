# @infernocms/next

Next.js extension for [InfernoCMS](https://github.com/ochoadan/infernocms): a typed client generated from your `content.config.ts`, a webhook revalidation route factory, and an image component that knows how to talk to your CMS.

## Install

```bash
pnpm add @infernocms/next infernocms
```

In your project's `package.json` scripts, add a codegen step:

```json
{
  "scripts": {
    "predev": "infernocms-next codegen",
    "prebuild": "infernocms-next codegen",
    "dev": "next dev",
    "build": "next build"
  }
}
```

Set environment variables:

```env
INFERNOCMS_URL=https://cms.example.com
# Optional, only if your CMS gates reads
INFERNOCMS_READ_TOKEN=icms_...
# Optional, only for webhook revalidation
INFERNOCMS_WEBHOOK_SECRET=icms_...
```

## Codegen

`infernocms-next codegen` reads your `content.config.ts` and emits two files into `.infernocms-next/`:

- `types.ts` — TypeScript interfaces for every collection.
- `client.ts` — pre-typed `cms` (read) and `writeCms` (write factory) instances.

Add `.infernocms-next/` to `.gitignore`. The codegen step regenerates them on every `dev`/`build`.

## Read client

```ts
// In a server component, route handler, or server action:
import { cms } from '@/.infernocms-next/client';

const posts = await cms.posts.list({
  where: { status: 'published' },
  sort: '-createdAt',
  page: 1,
  perPage: 10,
  depth: 1,
});

const post  = await cms.posts.bySlug('hello-world', { depth: 1 });
const item  = await cms.authors.byId(5);
const total = await cms.posts.count({ status: 'published' });
```

Per-collection methods:

| Method | Description |
|---|---|
| `list(opts?)` | Paginated list with `where`, `sort`, `page`, `perPage`, `depth`, `fields`, `search`, `cache` |
| `byId(id, opts?)` | Single item by id |
| `bySlug(slug, opts?)` | Single item by slug field (only for collections with a `slug` field) |
| `byField(name, value, opts?)` | Single item filtered by an arbitrary field |
| `count(where?)` | Total count |

Default cache: `{ next: { revalidate: 60, tags: ['cms:${collection}'] } }`. Override via `cache: { revalidate: 0, tags: ['custom'] }` per call.

## Write client

```ts
import 'server-only';
import { writeCms } from '@/.infernocms-next/client';

const wc = writeCms({ token: process.env.INFERNOCMS_WRITE_TOKEN! });
await wc.submissions.create({ email, message });
await wc.posts.update(42, { status: 'published' });
await wc.posts.delete(42);
```

The factory is a server-only construct: calling `writeCms` in a browser context throws. The token never reaches the client.

## Webhook revalidation route

```ts
// app/api/cms-webhook/route.ts
import { createInfernoCmsRevalidateRoute } from '@infernocms/next/webhook';

export const POST = createInfernoCmsRevalidateRoute({
  secret: process.env.INFERNOCMS_WEBHOOK_SECRET!,
  // Optional: derive paths to revalidate per event
  paths: ({ event, collection, data }) => {
    if (collection === 'posts' && typeof data.slug === 'string') {
      return ['/blog', `/blog/${data.slug}`];
    }
    return [];
  },
});
```

By default the route also calls `revalidateTag('cms:${collection}')`, which clears every cached read of that collection. Combined with the read client's automatic tagging, you usually don't need a `paths()` callback at all.

Register the webhook in your InfernoCMS config:

```ts
// content.config.ts
export default defineConfig({
  webhooks: [
    { url: 'https://yourapp.com/api/cms-webhook', secret: process.env.INFERNOCMS_WEBHOOK_SECRET },
  ],
  // ...
});
```

## CmsImage

```tsx
import { CmsImage } from '@infernocms/next/image';

<CmsImage src={post.cover} alt={post.title} width={800} height={400} />
```

Forwards every prop to Next's `<Image>`. Resolves CMS values:

- `https://other.com/foo.jpg` → unchanged
- `/uploads/foo.jpg` → `${INFERNOCMS_URL}/uploads/foo.jpg`
- `foo.jpg` (bare filename) → `${INFERNOCMS_URL}/uploads/foo.jpg`
- `null` / empty → renders nothing (returns `null`)

## Next.js config plugin

```ts
// next.config.ts
import { withInfernoCMS } from '@infernocms/next/config';

export default withInfernoCMS({ url: process.env.INFERNOCMS_URL })({
  // your existing next config
});
```

Adds the CMS host to `images.remotePatterns` so `<CmsImage>` works without manually configuring domains. Optional `extraImageHosts: string[]` for additional whitelisted hosts.

This wrapper does **not** auto-run codegen — keep `predev`/`prebuild` scripts as shown above, or run `infernocms-next watch` alongside `next dev`.

## CLI

```bash
infernocms-next codegen [--config content.config.ts] [--out .infernocms-next]
infernocms-next watch    # re-runs codegen on every config change
```

## License

AGPL-3.0-only.
