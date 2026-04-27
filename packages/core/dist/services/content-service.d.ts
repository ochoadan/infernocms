import type { NormalizedCollectionConfig, NormalizedConfig, NormalizedBlockConfig, CollectionHooks } from '../config/types.js';
import type { PaginatedResult } from '../database/repository.js';
import type { ParsedFilter } from '../api/filters.js';
import type { AppContext } from '../context.js';
export interface ValidationError {
    field: string;
    message: string;
}
interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    data: Record<string, unknown>;
}
export declare function validateData(collection: NormalizedCollectionConfig, data: Record<string, unknown>, checkRequired: boolean, blockSchemas?: Record<string, NormalizedBlockConfig>): ValidationResult;
export interface ListOptions {
    limit?: number;
    offset?: number;
    page?: number;
    perPage?: number;
    sort?: string;
    depth?: number;
    filters?: ParsedFilter[];
    fields?: string[];
    search?: string;
}
export interface ContentServiceOptions {
    hooks?: CollectionHooks;
}
export declare function valuesEqual(a: unknown, b: unknown): boolean;
export declare function onlySilentFieldsChanged(collection: NormalizedCollectionConfig, existing: Record<string, unknown>, cleaned: Record<string, unknown>): boolean;
export declare function createContentService(collection: NormalizedCollectionConfig, config: NormalizedConfig, ctx?: AppContext): {
    list(options: ListOptions): Promise<PaginatedResult<Record<string, unknown>>>;
    get(id: number, depth?: number, fields?: string[]): Promise<Record<string, unknown> | null>;
    create(data: Record<string, unknown>, hooks?: CollectionHooks): Promise<{
        item?: Record<string, unknown>;
        error?: string;
        validationErrors?: ValidationError[];
    }>;
    update(id: number, data: Record<string, unknown>, partial: boolean, hooks?: CollectionHooks): Promise<{
        item?: Record<string, unknown> | null;
        error?: string;
        validationErrors?: ValidationError[];
    }>;
    remove(id: number, hooks?: CollectionHooks): Promise<{
        deleted: boolean;
        existing?: Record<string, unknown>;
        cancelled?: boolean;
    }>;
};
export type ContentService = ReturnType<typeof createContentService>;
export {};
//# sourceMappingURL=content-service.d.ts.map