import type { NormalizedCollectionConfig, NormalizedConfig } from '../config/types.js';
import type { ParsedFilter } from '../api/filters.js';
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
    private allowedFields;
    constructor(collection: NormalizedCollectionConfig, config: NormalizedConfig);
    findAll(options?: FindAllOptions): Promise<PaginatedResult<Record<string, unknown>>>;
    findById(id: number, depth?: number, fields?: string[]): Promise<Record<string, unknown> | null>;
    create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
    update(id: number, data: Record<string, unknown>, partial?: boolean): Promise<Record<string, unknown> | null>;
    delete(id: number): Promise<boolean>;
    private buildSelectClause;
    private resolveRelations;
    private extractManyRelations;
    private generateSlugs;
    private ensureUniqueSlug;
    private saveManyRelations;
    private sanitizeData;
    private buildWhereClause;
    private buildOrderByClause;
}
export declare function getRepository(collection: NormalizedCollectionConfig, config: NormalizedConfig): Repository;
//# sourceMappingURL=repository.d.ts.map