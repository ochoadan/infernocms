import type { WebhookConfig } from './config/domain-types.js';
/**
 * `status_change` fires in addition to `update` when the value of a field
 * literally named `status` differs between before and after. Subscribers
 * use it to react to lifecycle transitions (e.g., draft → pending_review →
 * published) without having to diff arbitrary update events.
 */
export type WebhookEvent = 'create' | 'update' | 'delete' | 'status_change';
export interface StatusChangeMeta {
    field: 'status';
    from: unknown;
    to: unknown;
}
export interface WebhookPayload {
    event: WebhookEvent;
    collection: string;
    timestamp: string;
    data: unknown;
    /** Present on status_change events; describes the transition. */
    meta?: StatusChangeMeta;
}
export declare function dispatchWebhooks(webhooks: WebhookConfig[], event: WebhookEvent, collection: string, data: unknown, meta?: StatusChangeMeta): void;
//# sourceMappingURL=webhooks.d.ts.map