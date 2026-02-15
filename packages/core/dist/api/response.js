export function formatResponse(data) {
    return { data };
}
export function formatPaginatedResponse(data, meta) {
    return { data, meta };
}
export function formatError(message, code) {
    return {
        error: {
            message,
            ...(code && { code }),
        },
    };
}
//# sourceMappingURL=response.js.map