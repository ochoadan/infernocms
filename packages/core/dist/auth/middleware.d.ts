import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../database/client.js';
import { type TokenScope } from './tokens.js';
export interface AuthUser {
    id: string;
    name: string;
    scope: TokenScope;
    _isAdmin: boolean;
}
export declare function registerAuthMiddleware(app: FastifyInstance, db: DbClient): void;
//# sourceMappingURL=middleware.d.ts.map