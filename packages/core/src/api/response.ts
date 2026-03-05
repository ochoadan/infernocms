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
    details?: { field: string; message: string }[];
  };
}

export function formatResponse<T>(data: T): ApiResponse<T> {
  return { data };
}

export function formatPaginatedResponse<T>(
  data: T[],
  meta: { total: number; page: number; perPage: number; totalPages: number }
): PaginatedApiResponse<T> {
  return { data, meta };
}

export function formatError(message: string, code?: string, details?: { field: string; message: string }[]): ErrorResponse {
  return {
    error: {
      message,
      ...(code && { code }),
      ...(details && details.length > 0 && { details }),
    },
  };
}
