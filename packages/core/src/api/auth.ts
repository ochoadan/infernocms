import { createHmac } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { AuthConfig } from '../config/types.js';

function base64UrlDecode(str: string): string {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded, 'base64url').toString('utf-8');
}

function verifyJwt(
  token: string,
  secret: string
): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify signature
  const data = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  if (expectedSig !== signatureB64) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as Record<string, unknown>;

    // Check expiration
    if (payload.exp && typeof payload.exp === 'number') {
      if (Date.now() >= payload.exp * 1000) return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function registerAuth(
  app: FastifyInstance,
  authConfig: AuthConfig
): void {
  app.addHook('onRequest', async (request) => {
    const req = request as unknown as Record<string, unknown>;

    // Check admin key header
    if (authConfig.adminSecret) {
      const adminKey = request.headers['x-admin-key'] as string | undefined;
      if (adminKey && adminKey === authConfig.adminSecret) {
        req.user = { role: 'admin', _isAdmin: true };
        return;
      }
    }

    // Check JWT Bearer token
    if (authConfig.secret) {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const payload = verifyJwt(token, authConfig.secret);
        if (payload) {
          req.user = payload;
          return;
        }
      }
    }
  });
}
