export function formatResponse(data) {
    return { data };
}
export function formatPaginatedResponse(data, meta) {
    return { data, meta };
}
export function formatError(message, code, details) {
    return {
        error: {
            message,
            ...(code && { code }),
            ...(details && details.length > 0 && { details }),
        },
    };
}
//# sourceMappingURL=response.js.map