import type { FastifyInstance } from 'fastify';
import type { NormalizedConfig, WebhookConfig } from '../config/types.js';
import type { HooksMap } from './hooks.js';
import type { AccessMap } from './access.js';
import type { StorageDriver } from '../storage/driver.js';
import type { AppContext } from '../context.js';
import type { DbClient } from '../database/client.js';
export declare function registerRoutes(app: FastifyInstance, config: NormalizedConfig, db: DbClient, hooks?: HooksMap, access?: AccessMap, storage?: StorageDriver, ctx?: AppContext, webhooks?: WebhookConfig[]): Promise<void>;
export declare function getEndpointList(config: NormalizedConfig): string[];
//# sourceMappingURL=routes.d.ts.map