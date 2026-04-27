export interface QueryResult<T> {
    rows: T[];
    affectedRows?: number;
}
export interface DbClient {
    query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    exec(sql: string): Promise<void>;
    close(): Promise<void>;
    transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T>;
}
//# sourceMappingURL=client.d.ts.map