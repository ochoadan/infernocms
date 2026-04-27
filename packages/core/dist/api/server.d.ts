import { type FastifyInstance } from 'fastify';
import type { NormalizedConfig, AuthConfig, WebhookConfig } from '../config/types.js';
import type { HooksMap } from './hooks.js';
import type { AccessMap } from './access.js';
import type { StorageDriver } from '../storage/driver.js';
import type { AppContext } from '../context.js';
export interface ServerOptions {
    port?: number;
    host?: string;
    logger?: boolean;
    hooks?: HooksMap;
    access?: AccessMap;
    auth?: AuthConfig;
    storage?: StorageDriver;
    ctx?: AppContext;
    webhooks?: WebhookConfig[];
    cors?: {
        origin?: string | string[] | boolean;
    };
    rateLimit?: {
        max?: number;
        timeWindow?: string;
    };
}
export declare function createServer(config: NormalizedConfig, options?: ServerOptions): Promise<FastifyInstance>;
export declare function startServer(app: FastifyInstance, options?: ServerOptions): Promise<void>;
//# sourceMappingURL=server.d.ts.map