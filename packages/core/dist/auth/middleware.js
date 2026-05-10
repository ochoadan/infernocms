import { lookupToken } from './tokens.js';
export function registerAuthMiddleware(app, db) {
    app.addHook('onRequest', async (request) => {
        const header = request.headers.authorization;
        if (!header || !header.startsWith('Bearer '))
            return;
        const token = header.slice(7).trim();
        if (!token)
            return;
        const found = await lookupToken(db, token);
        if (!found)
            return;
        const user = {
            id: found.id,
            name: found.name,
            scope: found.scope,
            _isAdmin: found.scope === 'admin',
        };
        request.user = user;
    });
}
//# sourceMappingURL=middleware.js.map