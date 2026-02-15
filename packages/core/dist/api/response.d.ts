export interface ApiResponse<T> {
    data: T;
}
export interface PaginatedApiResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        perPage: number;
        totalPages: number;
    };
}
export interface ErrorResponse {
    error: {
        message: string;
        code?: string;
    };
}
export declare function formatResponse<T>(data: T): ApiResponse<T>;
export declare function formatPaginatedResponse<T>(data: T[], meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
}): PaginatedApiResponse<T>;
export declare function formatError(message: string, code?: string): ErrorResponse;
//# sourceMappingURL=response.d.ts.map