import { revalidateTag, revalidatePath } from 'next/cache';

export type WebhookEvent = 'create' | 'update' | 'delete' | 'status_change';

export interface InfernoCmsWebhookPayload {
  event: WebhookEvent;
  collection: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface RevalidateRouteOptions {
  /**
   * Required. The secret InfernoCMS sends in `Authorization: Bearer <secret>`.
   */
  secret: string;
  /**
   * Optional. Return paths to revalidate based on the webhook event. The default
   * tag `cms:${collection}` is always revalidated, regardless of this callback.
   */
  paths?: (payload: InfernoCmsWebhookPayload) => string[] | Promise<string[]>;
  /**
   * Optional. Override the default tag (`cms:${collection}`). Return `null` to
   * skip tag revalidation for this event.
   */
  tag?: (payload: InfernoCmsWebhookPayload) => string | null;
}

interface RouteHandler {
  (req: Request): Promise<Response>;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isWebhookPayload(value: unknown): value is InfernoCmsWebhookPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.event === 'string' &&
    typeof v.collection === 'string' &&
    typeof v.timestamp === 'string' &&
    typeof v.data === 'object' &&
    v.data !== null
  );
}

export function createInfernoCmsRevalidateRoute(opts: RevalidateRouteOptions): RouteHandler {
  if (!opts.secret) {
    throw new Error('createInfernoCmsRevalidateRoute requires `secret`.');
  }
  return async function POST(req: Request): Promise<Response> {
    const auth = req.headers.get('authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return jsonResponse({ error: { message: 'Missing bearer token', code: 'UNAUTHENTICATED' } }, 401);
    }
    const provided = auth.slice(7).trim();
    if (provided !== opts.secret) {
      return jsonResponse({ error: { message: 'Invalid bearer token', code: 'UNAUTHENTICATED' } }, 401);
    }

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: { message: 'Body is not valid JSON', code: 'VALIDATION' } }, 400);
    }
    if (!isWebhookPayload(payload)) {
      return jsonResponse(
        { error: { message: 'Body does not match InfernoCMS webhook payload shape', code: 'VALIDATION' } },
        400
      );
    }

    const tag = opts.tag ? opts.tag(payload) : `cms:${payload.collection}`;
    const revalidatedTags: string[] = [];
    if (tag) {
      revalidateTag(tag);
      revalidatedTags.push(tag);
    }

    const revalidatedPaths: string[] = [];
    if (opts.paths) {
      const result = await opts.paths(payload);
      for (const p of result) {
        revalidatePath(p);
        revalidatedPaths.push(p);
      }
    }

    return jsonResponse({
      data: { ok: true, revalidatedTags, revalidatedPaths },
    });
  };
}
