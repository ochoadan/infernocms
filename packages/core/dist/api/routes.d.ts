import type { FastifyInstance } from 'fastify';
import type { NormalizedConfig, AuthConfig } from '../config/types.js';
import type { HooksMap } from './hooks.js';
import type { AccessMap } from './access.js';
import type { StorageDriver } from '../storage/driver.js';
import type { AppContext } from '../context.js';
export declare function registerRoutes(app: FastifyInstance, config: NormalizedConfig, hooks?: HooksMap, access?: AccessMap, auth?: AuthConfig, storage?: StorageDriver, ctx?: AppContext): Promise<void>;
export declare function getEndpointList(config: NormalizedConfig): string[];
//# sourceMappingURL=routes.d.ts.map