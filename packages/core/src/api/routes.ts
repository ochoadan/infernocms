import { extname } from 'node:path';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { NormalizedConfig, AuthConfig } from '../config/types.js';
import type { HooksMap } from './hooks.js';
import type { AccessMap } from './access.js';
import {
  createListHandler,
  createGetHandler,
  createCreateHandler,
  createUpdateHandler,
  createDeleteHandler,
} from './handlers.js';
import { formatResponse, formatError } from './response.js';
import { getStorage } from '../storage/index.js';

function requireAuth(request: FastifyRequest, reply: FastifyReply): boolean {
  const user = (request as unknown as Record<string, unknown>).user;
  if (!user) {
    reply.status(403);
    reply.send(formatError('Authentication required', 'FORBIDDEN'));
    return false;
  }
  return true;
}

export async function registerRoutes(
  app: FastifyInstance,
  config: NormalizedConfig,
  hooks?: HooksMap,
  access?: AccessMap,
  auth?: AuthConfig
): Promise<void> {
  // Schema endpoint for admin UI
  app.get('/api/_schema', async (request, reply) => {
    if (auth && !requireAuth(request, reply)) return;

    const collections: Record<string, unknown> = {};
    for (const [name, col] of Object.entries(config.collections)) {
      collections[name] = {
        name: col.name,
        fields: col.fields,
      };
    }
    return { blocks: config.blocks, collections };
  });

  // File upload endpoint
  app.post('/api/_upload', async (request, reply) => {
    if (auth && !requireAuth(request, reply)) return;

    const file = await request.file();
    if (!file) {
      reply.status(400);
      return formatError('No file provided');
    }

    const buffer = await file.toBuffer();
    const storage = getStorage();
    const url = await storage.upload(file.filename, buffer, file.mimetype);

    return formatResponse({ url, filename: file.filename, ext: extname(file.filename) });
  });

  // Collection CRUD routes
  for (const collection of Object.values(config.collections)) {
    const basePath = `/api/${collection.name}`;
    const collectionAccess = access?.[collection.name];

    // When auth is configured, default write ops to require authentication.
    // Explicit user-defined rules always win via ?? fallback.
    // Read access stays open (CMS content is typically public).
    const effectiveAccess = auth
      ? {
          read: collectionAccess?.read,
          create: collectionAccess?.create ?? (({ user }: { user?: Record<string, unknown> }) => !!user),
          update: collectionAccess?.update ?? (({ user }: { user?: Record<string, unknown> }) => !!user),
          delete: collectionAccess?.delete ?? (({ user }: { user?: Record<string, unknown> }) => !!user),
        }
      : collectionAccess;

    const handlerOpts = {
      hooks: hooks?.[collection.name],
      access: effectiveAccess,
    };

    app.get(basePath, createListHandler(collection, config, handlerOpts));
    app.get(`${basePath}/:id`, createGetHandler(collection, config, handlerOpts));
    app.post(basePath, createCreateHandler(collection, config, handlerOpts));
    app.put(`${basePath}/:id`, createUpdateHandler(collection, config, false, handlerOpts));
    app.patch(`${basePath}/:id`, createUpdateHandler(collection, config, true, handlerOpts));
    app.delete(`${basePath}/:id`, createDeleteHandler(collection, config, handlerOpts));
  }
}

export function getEndpointList(config: NormalizedConfig): string[] {
  const endpoints: string[] = [
    'GET    /api/_schema',
    'POST   /api/_upload',
  ];

  for (const collection of Object.values(config.collections)) {
    const basePath = `/api/${collection.name}`;
    endpoints.push(
      `GET    ${basePath}`,
      `GET    ${basePath}/:id`,
      `POST   ${basePath}`,
      `PUT    ${basePath}/:id`,
      `PATCH  ${basePath}/:id`,
      `DELETE ${basePath}/:id`
    );
  }

  return endpoints;
}
