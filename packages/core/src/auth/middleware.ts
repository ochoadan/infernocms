import type { FastifyInstance } from 'fastify';
import type { DbClient } from '../database/client.js';
import { lookupToken, type TokenScope } from './tokens.js';

export interface AuthUser {
  id: string;
  name: string;
  scope: TokenScope;
  _isAdmin: boolean;
}

export function registerAuthMiddleware(app: FastifyInstance, db: DbClient): void {
  app.addHook('onRequest', async (request) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return;
    const token = header.slice(7).trim();
    if (!token) return;
    const found = await lookupToken(db, token);
    if (!found) return;
    const user: AuthUser = {
      id: found.id,
      name: found.name,
      scope: found.scope,
      _isAdmin: found.scope === 'admin',
    };
    (request as unknown as Record<string, unknown>).user = user;
  });
}
