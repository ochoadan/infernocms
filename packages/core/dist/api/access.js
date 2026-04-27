export function extractAccess(config) {
    const access = {};
    for (const [name, collection] of Object.entries(config.collections)) {
        if (collection.access) {
            access[name] = collection.access;
        }
    }
    return access;
}
export async function checkAccess(rule, ctx) {
    if (rule === undefined)
        return true;
    if (typeof rule === 'boolean')
        return rule;
    return rule(ctx);
}
//# sourceMappingURL=access.js.map