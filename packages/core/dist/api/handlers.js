import { createContentService } from '../services/content-service.js';
import { parseFilterParams } from './filters.js';
import { checkAccess } from './access.js';
import { formatResponse, formatPaginatedResponse, formatError } from './response.js';
export function createListHandler(collection, config, options) {
    const allowedFilterFields = new Set([
        ...Object.keys(collection.fields),
        'id', 'createdAt', 'updatedAt',
    ]);
    const service = createContentService(collection, config, options?.ctx);
    return async (request, reply) => {
        if (options?.access?.read !== undefined) {
            const user = request.user;
            const allowed = await checkAccess(options.access.read, { user });
            if (!allowed) {
                reply.status(403);
                return formatError('Access denied', 'FORBIDDEN');
            }
        }
        const { limit, offset, page, perPage, sort, depth, fields: _f, search: _s, ...rest } = request.query;
        const filterQuery = { ...rest };
        if (request.query.fields)
            filterQuery.fields = request.query.fields;
        if (request.query.search)
            filterQuery.search = request.query.search;
        const parsed = parseFilterParams(filterQuery, allowedFilterFields);
        const result = await service.list({
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
            page: page ? parseInt(page, 10) : undefined,
            perPage: perPage ? parseInt(perPage, 10) : undefined,
            sort,
            filters: parsed.filters,
            depth: depth ? parseInt(depth, 10) : undefined,
            fields: parsed.fields,
            search: parsed.search,
        });
        return formatPaginatedResponse(result.data, result.meta);
    };
}
export function createGetHandler(collection, config, options) {
    const service = createContentService(collection, config, options?.ctx);
    return async (request, reply) => {
        if (options?.access?.read !== undefined) {
            const user = request.user;
            const allowed = await checkAccess(options.access.read, { user });
            if (!allowed) {
                reply.status(403);
                return formatError('Access denied', 'FORBIDDEN');
            }
        }
        const id = parseInt(request.params.id, 10);
        if (isNaN(id)) {
            reply.status(400);
            return formatError('Invalid ID format');
        }
        const depth = request.query.depth ? parseInt(request.query.depth, 10) : 0;
        const fields = request.query.fields?.split(',').map((f) => f.trim()).filter(Boolean);
        const item = await service.get(id, depth, fields);
        if (!item) {
            reply.status(404);
            return formatError('Not found', 'NOT_FOUND');
        }
        return formatResponse(item);
    };
}
export function createCreateHandler(collection, config, options) {
    const service = createContentService(collection, config, options?.ctx);
    return async (request, reply) => {
        if (options?.access?.create !== undefined) {
            const user = request.user;
            const allowed = await checkAccess(options.access.create, { user });
            if (!allowed) {
                reply.status(403);
                return formatError('Access denied', 'FORBIDDEN');
            }
        }
        const result = await service.create(request.body ?? {}, options?.hooks);
        if (result.error) {
            reply.status(400);
            return formatError(result.error, 'VALIDATION_ERROR');
        }
        reply.status(201);
        return formatResponse(result.item);
    };
}
export function createUpdateHandler(collection, config, partial = false, options) {
    const service = createContentService(collection, config, options?.ctx);
    return async (request, reply) => {
        const id = parseInt(request.params.id, 10);
        if (isNaN(id)) {
            reply.status(400);
            return formatError('Invalid ID format');
        }
        // Access check needs the existing item, so we peek first
        if (options?.access?.update !== undefined) {
            const user = request.user;
            const existing = await service.get(id);
            if (!existing) {
                reply.status(404);
                return formatError('Not found', 'NOT_FOUND');
            }
            const allowed = await checkAccess(options.access.update, { user, item: existing });
            if (!allowed) {
                reply.status(403);
                return formatError('Access denied', 'FORBIDDEN');
            }
        }
        const result = await service.update(id, request.body ?? {}, partial, options?.hooks);
        if (result.error) {
            reply.status(400);
            return formatError(result.error, 'VALIDATION_ERROR');
        }
        if (!result.item) {
            reply.status(404);
            return formatError('Not found', 'NOT_FOUND');
        }
        return formatResponse(result.item);
    };
}
export function createDeleteHandler(collection, config, options) {
    const service = createContentService(collection, config, options?.ctx);
    return async (request, reply) => {
        const id = parseInt(request.params.id, 10);
        if (isNaN(id)) {
            reply.status(400);
            return formatError('Invalid ID format');
        }
        // Access check needs the existing item
        if (options?.access?.delete !== undefined) {
            const existing = await service.get(id);
            if (!existing) {
                reply.status(404);
                return formatError('Not found', 'NOT_FOUND');
            }
            const user = request.user;
            const allowed = await checkAccess(options.access.delete, { user, item: existing });
            if (!allowed) {
                reply.status(403);
                return formatError('Access denied', 'FORBIDDEN');
            }
        }
        const result = await service.remove(id, options?.hooks);
        if (result.cancelled) {
            reply.status(403);
            return formatError('Deletion cancelled by hook', 'FORBIDDEN');
        }
        if (!result.deleted) {
            reply.status(404);
            return formatError('Not found', 'NOT_FOUND');
        }
        reply.status(204);
        return;
    };
}
//# sourceMappingURL=handlers.js.map