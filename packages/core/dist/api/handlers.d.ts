import type { FastifyRequest, FastifyReply } from 'fastify';
import type { NormalizedCollectionConfig, NormalizedConfig, CollectionHooks, CollectionAccess } from '../config/types.js';
import type { AppContext } from '../context.js';
interface ListQuerystring {
    limit?: string;
    offset?: string;
    page?: string;
    perPage?: string;
    sort?: string;
    depth?: string;
    fields?: string;
    search?: string;
    [key: string]: string | undefined;
}
interface IdParams {
    id: string;
}
interface GetQuerystring {
    depth?: string;
    fields?: string;
}
export interface HandlerOptions {
    hooks?: CollectionHooks;
    access?: CollectionAccess;
    ctx?: AppContext;
}
export declare function createListHandler(collection: NormalizedCollectionConfig, config: NormalizedConfig, options?: HandlerOptions): (request: FastifyRequest<{
    Querystring: ListQuerystring;
}>, reply: FastifyReply) => Promise<import("./response.js").ErrorResponse | import("./response.js").PaginatedApiResponse<Record<string, unknown>>>;
export declare function createGetHandler(collection: NormalizedCollectionConfig, config: NormalizedConfig, options?: HandlerOptions): (request: FastifyRequest<{
    Params: IdParams;
    Querystring: GetQuerystring;
}>, reply: FastifyReply) => Promise<import("./response.js").ErrorResponse | import("./response.js").ApiResponse<Record<string, unknown>>>;
export declare function createCreateHandler(collection: NormalizedCollectionConfig, config: NormalizedConfig, options?: HandlerOptions): (request: FastifyRequest<{
    Body: Record<string, unknown>;
}>, reply: FastifyReply) => Promise<import("./response.js").ErrorResponse | import("./response.js").ApiResponse<Record<string, unknown>>>;
export declare function createUpdateHandler(collection: NormalizedCollectionConfig, config: NormalizedConfig, partial?: boolean, options?: HandlerOptions): (request: FastifyRequest<{
    Params: IdParams;
    Body: Record<string, unknown>;
}>, reply: FastifyReply) => Promise<import("./response.js").ErrorResponse | import("./response.js").ApiResponse<Record<string, unknown>>>;
export declare function createDeleteHandler(collection: NormalizedCollectionConfig, config: NormalizedConfig, options?: HandlerOptions): (request: FastifyRequest<{
    Params: IdParams;
}>, reply: FastifyReply) => Promise<import("./response.js").ErrorResponse | undefined>;
export {};
//# sourceMappingURL=handlers.d.ts.map