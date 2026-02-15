export function extractHooks(config) {
    const hooks = {};
    for (const [name, collection] of Object.entries(config.collections)) {
        if (collection.hooks) {
            hooks[name] = collection.hooks;
        }
    }
    return hooks;
}
//# sourceMappingURL=hooks.js.map