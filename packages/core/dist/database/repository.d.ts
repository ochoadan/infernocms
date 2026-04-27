import type { NormalizedCollectionConfig, NormalizedConfig } from '../config/types.js';
import type { ParsedFilter } from '../api/filters.js';
import type { DbClient } from './client.js';
export interface FindAllOptions {
    limit?: number;
    offset?: number;
    page?: number;
    perPage?: number;
    sort?: string;
    filters?: ParsedFilter[];
    depth?: number;
    fields?: string[];
    search?: string;
}
export interface PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        perPage: number;
        totalPages: number;
    };
}
export declare class Repository {
    private tableName;
    private collection;
    private config;
    private db;
    private allowedFields;
    constructor(collection: NormalizedCollectionConfig, config: NormalizedConfig, db?: DbClient);
    findAll(options?: FindAllOptions): Promise<PaginatedResult<Record<string, unknown>>>;
    findById(id: number, depth?: number, fields?: string[]): Promise<Record<string, unknown> | null>;
    create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
    update(id: number, data: Record<string, unknown>, partial?: boolean, options?: {
        skipTimestamp?: boolean;
    }): Promise<Record<string, unknown> | null>;
    delete(id: number): Promise<boolean>;
    private buildSelectClause;
    private batchResolveRelations;
    private resolveRelations;
    private extractManyRelations;
    private generateSlugs;
    private ensureUniqueSlug;
    private saveManyRelations;
    private sanitizeData;
    private buildWhereClause;
    private buildOrderByClause;
}
/**
 * Create a repository instance. No module-level caching — use AppContext
 * for caching across handler lifetimes.
 */
export declare function getRepository(collection: NormalizedCollectionConfig, config: NormalizedConfig, db?: DbClient): Repository;
/** @deprecated No-op. Repository caching is now handled by AppContext. */
export declare function clearRepositories(): void;
//# sourceMappingURL=repository.d.ts.map