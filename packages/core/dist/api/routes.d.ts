import type { FastifyInstance } from 'fastify';
import type { NormalizedConfig } from '../config/types.js';
import type { HooksMap } from './hooks.js';
import type { AccessMap } from './access.js';
export declare function registerRoutes(app: FastifyInstance, config: NormalizedConfig, hooks?: HooksMap, access?: AccessMap): Promise<void>;
export declare function getEndpointList(config: NormalizedConfig): string[];
//# sourceMappingURL=routes.d.ts.map