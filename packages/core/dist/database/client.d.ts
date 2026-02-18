export interface QueryResult<T> {
    rows: T[];
    affectedRows?: number;
}
export interface DbClient {
    query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    exec(sql: string): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map