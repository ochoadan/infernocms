import { type FastifyInstance } from 'fastify';
import type { NormalizedConfig, WebhookConfig } from '../config/types.js';
import type { HooksMap } from './hooks.js';
import type { AccessMap } from './access.js';
import type { StorageDriver } from '../storage/driver.js';
import type { AppContext } from '../context.js';
import type { DbClient } from '../database/client.js';
export interface ServerOptions {
    port?: number;
    host?: string;
    logger?: boolean;
    hooks?: HooksMap;
    access?: AccessMap;
    storage?: StorageDriver;
    ctx?: AppContext;
    webhooks?: WebhookConfig[];
    db: DbClient;
    cors?: {
        origin?: string | string[] | boolean;
    };
    rateLimit?: {
        max?: number;
        timeWindow?: string;
    };
}
export declare function createServer(config: NormalizedConfig, options: ServerOptions): Promise<FastifyInstance>;
export declare function startServer(app: FastifyInstance, options?: {
    port?: number;
    host?: string;
}): Promise<void>;
//# sourceMappingURL=server.d.ts.map