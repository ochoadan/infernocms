import type { InfernoCMSConfig, CollectionAccess, AccessRule, ItemAccessRule, AccessContext, ItemAccessContext } from '../config/types.js';
export type AccessMap = Record<string, CollectionAccess>;
export declare function extractAccess(config: InfernoCMSConfig): AccessMap;
export declare function checkAccess(rule: AccessRule | ItemAccessRule | undefined, ctx: AccessContext | ItemAccessContext): Promise<boolean>;
//# sourceMappingURL=access.d.ts.map