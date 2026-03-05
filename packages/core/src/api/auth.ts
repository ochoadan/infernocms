import { createHmac, timingSafeEqual } from 'node:crypto';
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

  // Validate alg header — reject anything other than HS256
  try {
    const header = JSON.parse(base64UrlDecode(headerB64)) as Record<string, unknown>;
    if (header.alg !== 'HS256') return null;
  } catch {
    return null;
  }

  // Verify signature (timing-safe comparison)
  const data = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(signatureB64);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

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

function signJwt(payload: Record<string, unknown>, secret: string, expiresInSec = 86400): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat, exp: iat + expiresInSec })).toString('base64url');
  const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function getSessionSecret(authConfig: AuthConfig): string {
  if (authConfig.secret) return authConfig.secret;
  return createHmac('sha256', authConfig.adminSecret!).update('infernocms-session').digest('hex');
}

export function registerAuth(
  app: FastifyInstance,
  authConfig: AuthConfig
): void {
  // Login endpoint — validates admin key, issues session cookie
  if (authConfig.adminSecret) {
    app.post('/api/_auth/login', {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
        },
      },
    }, async (request, reply) => {
      const { key } = request.body as { key?: string };
      if (!key) {
        reply.status(401);
        return { error: 'Invalid credentials' };
      }
      const keyBuf = Buffer.from(key);
      const secretBuf = Buffer.from(authConfig.adminSecret!);
      if (keyBuf.length !== secretBuf.length || !timingSafeEqual(keyBuf, secretBuf)) {
        reply.status(401);
        return { error: 'Invalid credentials' };
      }
      const sessionSecret = getSessionSecret(authConfig);
      const token = signJwt({ role: 'admin', _isAdmin: true }, sessionSecret);
      reply.setCookie('infernocms-session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400,
      });
      return { ok: true };
    });
  }

  // Logout endpoint — clears session cookie
  app.post('/api/_auth/logout', async (_request, reply) => {
    reply.clearCookie('infernocms-session', { path: '/' });
    return { ok: true };
  });

  // Auth middleware
  app.addHook('onRequest', async (request) => {
    const req = request as unknown as Record<string, unknown>;

    // Check admin key header (backward compat for API consumers)
    if (authConfig.adminSecret) {
      const adminKey = request.headers['x-admin-key'] as string | undefined;
      if (adminKey) {
        const keyBuf = Buffer.from(adminKey);
        const secretBuf = Buffer.from(authConfig.adminSecret);
        if (keyBuf.length === secretBuf.length && timingSafeEqual(keyBuf, secretBuf)) {
          req.user = { role: 'admin', _isAdmin: true };
          return;
        }
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

    // Check session cookie
    const sessionToken = (request as unknown as { cookies?: Record<string, string> }).cookies?.['infernocms-session'];
    if (sessionToken) {
      const sessionSecret = getSessionSecret(authConfig);
      const payload = verifyJwt(sessionToken, sessionSecret);
      if (payload) {
        req.user = payload;
        return;
      }
    }
  });
}
