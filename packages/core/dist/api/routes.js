import { extname as nodeExtname } from 'node:path';
import { createListHandler, createGetHandler, createCreateHandler, createUpdateHandler, createDeleteHandler, } from './handlers.js';
import { formatResponse, formatError } from './response.js';
import { registerAuthRoutes } from './auth.js';
import { getStorage } from '../storage/index.js';
const ALLOWED_UPLOAD_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',
    '.mp4', '.webm', '.mp3', '.wav', '.ogg',
    '.zip', '.json',
]);
function requireAuth(request, reply) {
    const user = request.user;
    if (!user) {
        reply.status(401);
        reply.send(formatError('Authentication required', 'UNAUTHENTICATED'));
        return false;
    }
    return true;
}
function requireAdmin(request, reply) {
    const user = request.user;
    if (!user || !user._isAdmin) {
        reply.status(403);
        reply.send(formatError('Admin scope required', 'FORBIDDEN'));
        return false;
    }
    return true;
}
export async function registerRoutes(app, config, db, hooks, access, storage, ctx, webhooks) {
    // Health check (public)
    app.get('/api/_health', async () => ({ status: 'ok' }));
    // Auth routes (token CRUD + /me)
    registerAuthRoutes(app, db);
    // Schema endpoint (admin only — schema reveals collection structure)
    app.get('/api/_schema', async (request, reply) => {
        if (!requireAdmin(request, reply))
            return;
        const collections = {};
        for (const [name, col] of Object.entries(config.collections)) {
            collections[name] = { name: col.name, fields: col.fields };
        }
        return formatResponse({ blocks: config.blocks, collections });
    });
    // File upload (write or admin scope)
    app.post('/api/_upload', async (request, reply) => {
        if (!requireAuth(request, reply))
            return;
        const user = request.user;
        if (user.scope === 'read') {
            reply.status(403);
            return formatError('Write or admin scope required', 'FORBIDDEN');
        }
        const file = await request.file();
        if (!file) {
            reply.status(400);
            return formatError('No file provided');
        }
        const ext = nodeExtname(file.filename).toLowerCase();
        if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
            reply.status(400);
            return formatError(`File type '${ext}' is not allowed`);
        }
        let buffer;
        try {
            buffer = await file.toBuffer();
        }
        catch (err) {
            app.log.error({ err }, 'Failed to read uploaded file');
            reply.status(400);
            return formatError('Failed to read uploaded file');
        }
        const storageDriver = storage ?? ctx?.storage ?? getStorage();
        let url;
        try {
            url = await storageDriver.upload(file.filename, buffer, file.mimetype);
        }
        catch (err) {
            app.log.error({ err }, 'Failed to store uploaded file');
            reply.status(500);
            return formatError('Failed to store uploaded file');
        }
        return formatResponse({ url, filename: file.filename, ext });
    });
    // Collection CRUD with scope-based access defaults
    for (const collection of Object.values(config.collections)) {
        const basePath = `/api/${collection.name}`;
        const collectionAccess = access?.[collection.name];
        const effectiveAccess = {
            read: collectionAccess?.read,
            create: collectionAccess?.create ?? (({ user }) => !!user && (user.scope === 'write' || user.scope === 'admin')),
            update: collectionAccess?.update ?? (({ user }) => !!user && (user.scope === 'write' || user.scope === 'admin')),
            delete: collectionAccess?.delete ?? (({ user }) => user?.scope === 'admin'),
        };
        const handlerOpts = { hooks: hooks?.[collection.name], access: effectiveAccess, ctx, webhooks };
        app.get(basePath, createListHandler(collection, config, handlerOpts));
        app.get(`${basePath}/:id`, createGetHandler(collection, config, handlerOpts));
        app.post(basePath, createCreateHandler(collection, config, handlerOpts));
        app.put(`${basePath}/:id`, createUpdateHandler(collection, config, false, handlerOpts));
        app.patch(`${basePath}/:id`, createUpdateHandler(collection, config, true, handlerOpts));
        app.delete(`${basePath}/:id`, createDeleteHandler(collection, config, handlerOpts));
    }
}
export function getEndpointList(config) {
    const endpoints = [
        'GET    /api/_health',
        'GET    /api/_auth/me',
        'GET    /api/_tokens',
        'POST   /api/_tokens',
        'DELETE /api/_tokens/:id',
        'GET    /api/_schema',
        'POST   /api/_upload',
    ];
    for (const collection of Object.values(config.collections)) {
        const basePath = `/api/${collection.name}`;
        endpoints.push(`GET    ${basePath}`, `GET    ${basePath}/:id`, `POST   ${basePath}`, `PUT    ${basePath}/:id`, `PATCH  ${basePath}/:id`, `DELETE ${basePath}/:id`);
    }
    return endpoints;
}
//# sourceMappingURL=routes.js.map