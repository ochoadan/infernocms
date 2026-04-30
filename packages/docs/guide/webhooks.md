# Webhooks

InfernoCMS can dispatch outbound HTTP requests when content changes — useful for triggering rebuilds, notifying other services, or feeding data into a search index.

## Configuration

Add a top-level `webhooks` array to your `content.config.ts`:

```ts
import { defineConfig, field } from 'infernocms';

export default defineConfig({
  webhooks: [
    {
      url: 'https://example.com/hook',
      collections: ['posts'],
      events: ['create', 'update'],
      secret: process.env.WEBHOOK_SECRET,
    },
  ],
  collections: {
    posts: {
      fields: {
        title: field.text({ required: true }),
      },
    },
  },
});
```

### Options

| Option | Type | Description |
|---|---|---|
| `url` | `string` | **Required.** Full URL to POST the payload to. |
| `collections` | `string[]` | Restrict the webhook to specific collections. Omit to fire for all collections. |
| `events` | `('create' \| 'update' \| 'delete')[]` | Restrict to specific lifecycle events. Omit to fire for all three. |
| `secret` | `string` | Optional HMAC secret. When set, payloads include an `X-Inferno-Signature` header. |

You can declare multiple webhooks; each is matched independently against every event.

## Payload

Every webhook delivery is a JSON `POST` with this shape:

```json
{
  "event": "create",
  "collection": "posts",
  "timestamp": "2026-04-30T19:17:49.667Z",
  "data": {
    "id": 1,
    "title": "Hello",
    "createdAt": "2026-04-30T19:17:49.667Z"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `event` | `'create' \| 'update' \| 'delete'` | Which lifecycle event fired. |
| `collection` | `string` | The collection name. |
| `timestamp` | `string` (ISO-8601) | When the event was dispatched. |
| `data` | `object` | The full item record after the change (for `delete`, the record before deletion). |

The `Content-Type` is always `application/json`. When `secret` is configured, the payload is also signed:

```
X-Inferno-Signature: <hex-encoded HMAC-SHA256 of the raw body>
```

## Verifying signatures

Compute HMAC-SHA256 of the raw request body using your secret and compare against the header:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

function verify(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  // Use timingSafeEqual to avoid timing attacks
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

## Delivery semantics

- **Fire-and-forget.** Webhooks are dispatched in the background. The CRUD response is not blocked on webhook delivery.
- **10-second timeout.** Each request aborts after 10 seconds.
- **No automatic retries in 0.1.0.** Failed deliveries are logged to `stderr` (`[inferno] webhook delivery failed for <url>: <reason>`) but not retried. If you need at-least-once delivery, run a queue between InfernoCMS and your destination.
- **No ordering guarantees.** Multiple webhook URLs are fired in parallel.

## Testing locally

For local development you can use a tunnel like `ngrok` or [webhook.site](https://webhook.site) to capture deliveries:

```ts
webhooks: [
  { url: 'https://webhook.site/<your-token>' },
],
```

Then create or update content via the admin or API and watch the deliveries arrive.

## Combining with hooks

Webhooks fire **after** content has been persisted, alongside the `afterCreate` / `afterUpdate` / `afterDelete` [hooks](/guide/hooks). If you need to enrich the payload or block on side effects, use a hook instead of (or in addition to) a webhook.
