import { listTokens, mintToken, revokeToken } from '../auth/tokens.js';
import { formatResponse, formatError } from './response.js';
function getUser(req) {
    return req.user;
}
export function registerAuthRoutes(app, db) {
    // Verify the current bearer token.
    app.get('/api/_auth/me', async (request, reply) => {
        const user = getUser(request);
        if (!user) {
            reply.status(401);
            return formatError('Authentication required', 'UNAUTHENTICATED');
        }
        return formatResponse({ id: user.id, name: user.name, scope: user.scope });
    });
    // List tokens (admin only).
    app.get('/api/_tokens', async (request, reply) => {
        const user = getUser(request);
        if (!user || !user._isAdmin) {
            reply.status(403);
            return formatError('Admin scope required', 'FORBIDDEN');
        }
        return formatResponse(await listTokens(db));
    });
    // Create token (admin only). Plaintext returned exactly once.
    app.post('/api/_tokens', async (request, reply) => {
        const user = getUser(request);
        if (!user || !user._isAdmin) {
            reply.status(403);
            return formatError('Admin scope required', 'FORBIDDEN');
        }
        const body = request.body;
        const name = typeof body?.name === 'string' ? body.name.trim() : '';
        const scope = body?.scope;
        if (!name) {
            reply.status(400);
            return formatError('name is required', 'VALIDATION');
        }
        if (scope !== 'read' && scope !== 'write' && scope !== 'admin') {
            reply.status(400);
            return formatError('scope must be one of: read, write, admin', 'VALIDATION');
        }
        const minted = await mintToken(db, { name, scope, createdBy: user.id });
        reply.status(201);
        return formatResponse(minted);
    });
    // Revoke token (admin only). Idempotent.
    app.delete('/api/_tokens/:id', async (request, reply) => {
        const user = getUser(request);
        if (!user || !user._isAdmin) {
            reply.status(403);
            return formatError('Admin scope required', 'FORBIDDEN');
        }
        const { id } = request.params;
        await revokeToken(db, id);
        reply.status(204);
        return null;
    });
}
//# sourceMappingURL=auth.js.map