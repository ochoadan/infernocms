import { createHmac } from 'node:crypto';
export function dispatchWebhooks(webhooks, event, collection, data, meta) {
    const payload = {
        event,
        collection,
        timestamp: new Date().toISOString(),
        data,
        ...(meta ? { meta } : {}),
    };
    const body = JSON.stringify(payload);
    for (const hook of webhooks) {
        if (hook.collections && !hook.collections.includes(collection))
            continue;
        if (hook.events && !hook.events.includes(event))
            continue;
        const headers = {
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
//# sourceMappingURL=webhooks.js.map