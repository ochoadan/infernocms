import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import type { NormalizedConfig, AuthConfig } from '../config/types.js';
import type { HooksMap } from './hooks.js';
import type { AccessMap } from './access.js';
import type { StorageDriver } from '../storage/driver.js';
import type { AppContext } from '../context.js';
import { registerRoutes } from './routes.js';
import { registerAuth } from './auth.js';

export interface ServerOptions {
  port?: number;
  host?: string;
  logger?: boolean;
  hooks?: HooksMap;
  access?: AccessMap;
  auth?: AuthConfig;
  storage?: StorageDriver;
  ctx?: AppContext;
  cors?: {
    origin?: string | string[] | boolean;
  };
  rateLimit?: {
    max?: number;
    timeWindow?: string;
  };
}

export async function createServer(
  config: NormalizedConfig,
  options: ServerOptions = {}
): Promise<FastifyInstance> {
  const { logger = true } = options;

  const app = Fastify({
    logger: logger
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          },
        }
      : false,
  });

  // Security response headers
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '0');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  });

  // Enable CORS for admin UI — restrict origin in production
  const corsOrigin = options.cors?.origin ?? (process.env.NODE_ENV === 'production' ? false : true);
  if (corsOrigin === true && process.env.NODE_ENV === 'production') {
    app.log.warn('CORS origin is set to allow all origins in production. Set cors.origin to restrict access.');
  }
  await app.register(cors, {
    origin: corsOrigin,
    credentials: corsOrigin !== true,
  });

  // Cookie parsing (needed for session auth)
  await app.register(cookie);

  // Rate limiting
  await app.register(rateLimit, {
    max: options.rateLimit?.max ?? 300,
    timeWindow: options.rateLimit?.timeWindow ?? '1 minute',
  });

  // Multipart for file uploads (10MB limit)
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  // Serve uploaded files with security headers (only for local storage)
  if (!config.storage?.provider || config.storage.provider === 'local') {
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }
    const safeInlineExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);
    await app.register(fastifyStatic, {
      root: uploadsDir,
      prefix: '/uploads/',
      setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; media-src 'self'");
        const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
        if (!safeInlineExts.has(ext)) {
          res.setHeader('Content-Disposition', 'attachment');
        }
      },
    });
  }

  // Register auth middleware if configured
  let effectiveAuth: AuthConfig | undefined = options.auth;
  if (effectiveAuth) {
    if (!effectiveAuth.secret && !effectiveAuth.adminSecret) {
      app.log.warn('Auth config provided but neither secret nor adminSecret is set — treating as no auth. Writes will be publicly accessible.');
      effectiveAuth = undefined;
    } else {
      registerAuth(app, effectiveAuth);
    }
  } else {
    app.log.warn('No auth configured — all API endpoints are publicly accessible. Set auth.adminSecret or auth.secret to protect your data.');
  }

  await registerRoutes(app, config, options.hooks, options.access, effectiveAuth, options.storage, options.ctx);

  return app;
}

export async function startServer(
  app: FastifyInstance,
  options: ServerOptions = {}
): Promise<void> {
  const { port = 4000, host = '0.0.0.0' } = options;

  await app.listen({ port, host });
}
