import { createHmac } from 'node:crypto';
import type { WebhookConfig } from './config/domain-types.js';

export type WebhookEvent = 'create' | 'update' | 'delete';

export interface WebhookPayload {
  event: WebhookEvent;
  collection: string;
  timestamp: string;
  data: unknown;
}

export function dispatchWebhooks(
  webhooks: WebhookConfig[],
  event: WebhookEvent,
  collection: string,
  data: unknown
): void {
  const payload: WebhookPayload = {
    event,
    collection,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);

  for (const hook of webhooks) {
    if (hook.collections && !hook.collections.includes(collection)) continue;
    if (hook.events && !hook.events.includes(event)) continue;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (hook.secret) {
      const signature = createHmac('sha256', hook.secret)
        .update(body)
        .digest('hex');
      headers['X-Inferno-Signature'] = signature;
    }

    fetch(hook.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10_000),
    }).catch((err) => {
      console.error(`[inferno] webhook delivery failed for ${hook.url}:`, err instanceof Error ? err.message : err);
    });
  }
}
