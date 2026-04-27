import { extname as nodeExtname } from 'node:path';
import { createListHandler, createGetHandler, createCreateHandler, createUpdateHandler, createDeleteHandler, } from './handlers.js';
import { formatResponse, formatError } from './response.js';
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
        reply.status(403);
        reply.send(formatError('Authentication required', 'FORBIDDEN'));
        return false;
    }
    return true;
}
export async function registerRoutes(app, config, hooks, access, auth, storage, ctx, webhooks) {
    // Health check endpoint
    app.get('/api/_health', async () => {
        return { status: 'ok' };
    });
    // Schema endpoint for admin UI
    app.get('/api/_schema', async (request, reply) => {
        if (auth && !requireAuth(request, reply))
            return;
        const collections = {};
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
        if (auth && !requireAuth(request, reply))
            return;
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
        catch {
            reply.status(400);
            return formatError('Failed to read uploaded file');
        }
        const storageDriver = storage ?? ctx?.storage ?? getStorage();
        let url;
        try {
            url = await storageDriver.upload(file.filename, buffer, file.mimetype);
        }
        catch (err) {
            reply.status(500);
            return formatError('Failed to store uploaded file');
        }
        return formatResponse({ url, filename: file.filename, ext });
    });
    // Collection CRUD routes
    for (const collection of Object.values(config.collections)) {
        const basePath = `/api/${collection.name}`;
        const collectionAccess = access?.[collection.name];
        // When auth is configured, default write ops to require authentication.
        // Explicit user-defined rules always win via ?? fallback.
        // Read access stays open (CMS content is typically public).
        // Delete defaults to admin-only (_isAdmin flag set by admin key / session login).
        const effectiveAccess = auth
            ? {
                read: collectionAccess?.read,
                create: collectionAccess?.create ?? (({ user }) => !!user),
                update: collectionAccess?.update ?? (({ user }) => !!user),
                delete: collectionAccess?.delete ?? (({ user }) => !!user?._isAdmin),
            }
            : collectionAccess;
        const handlerOpts = {
            hooks: hooks?.[collection.name],
            access: effectiveAccess,
            ctx,
            webhooks,
        };
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