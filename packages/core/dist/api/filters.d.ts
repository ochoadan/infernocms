export interface ParsedFilter {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in';
    value: unknown;
}
export declare function parseFilterParams(query: Record<string, string | undefined>, allowedFields: Set<string>): {
    filters: ParsedFilter[];
    search?: string;
    fields?: string[];
};
//# sourceMappingURL=filters.d.ts.map