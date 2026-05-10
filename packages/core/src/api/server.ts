import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import type { NormalizedConfig, WebhookConfig } from '../config/types.js';
import type { HooksMap } from './hooks.js';
import type { AccessMap } from './access.js';
import type { StorageDriver } from '../storage/driver.js';
import type { AppContext } from '../context.js';
import type { DbClient } from '../database/client.js';
import { registerRoutes } from './routes.js';
import { registerAuthMiddleware } from '../auth/middleware.js';

export interface ServerOptions {
  port?: number;
  host?: string;
  logger?: boolean;
  hooks?: HooksMap;
  access?: AccessMap;
  storage?: StorageDriver;
  ctx?: AppContext;
  webhooks?: WebhookConfig[];
  db: DbClient;
  cors?: { origin?: string | string[] | boolean };
  rateLimit?: { max?: number; timeWindow?: string };
}

export async function createServer(
  config: NormalizedConfig,
  options: ServerOptions
): Promise<FastifyInstance> {
  const { logger = true, db } = options;

  const app = Fastify({
    logger: logger
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
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

  // CORS — bearer auth means we don't need credentials, so this is simpler.
  // Default allow-all; tokens are not ambient credentials. Operators can lock
  // down via cors.origin if they want.
  await app.register(cors, {
    origin: options.cors?.origin ?? true,
    credentials: false,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: options.rateLimit?.max ?? 300,
    timeWindow: options.rateLimit?.timeWindow ?? '1 minute',
  });

  // Multipart for file uploads (10MB)
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // Local storage static serving
  if (!config.storage?.provider || config.storage.provider === 'local') {
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    const safeInlineExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);
    await app.register(fastifyStatic, {
      root: uploadsDir,
      prefix: '/uploads/',
      setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'none'; style-src 'unsafe-inline'; media-src 'self'"
        );
        const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
        if (!safeInlineExts.has(ext)) res.setHeader('Content-Disposition', 'attachment');
      },
    });
  }

  // Auth middleware always on (token-first model)
  registerAuthMiddleware(app, db);

  await registerRoutes(
    app,
    config,
    db,
    options.hooks,
    options.access,
    options.storage,
    options.ctx,
    options.webhooks
  );

  return app;
}

export async function startServer(
  app: FastifyInstance,
  options: { port?: number; host?: string } = {}
): Promise<void> {
  const { port = 4000, host = '0.0.0.0' } = options;
  await app.listen({ port, host });
}
