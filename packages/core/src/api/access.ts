import type {
  InfernoCMSConfig,
  CollectionAccess,
  AccessRule,
  ItemAccessRule,
  AccessContext,
  ItemAccessContext,
} from '../config/types.js';

export type AccessMap = Record<string, CollectionAccess>;

export function extractAccess(config: InfernoCMSConfig): AccessMap {
  const access: AccessMap = {};

  for (const [name, collection] of Object.entries(config.collections)) {
    if (collection.access) {
      access[name] = collection.access;
    }
  }

  return access;
}

export async function checkAccess(
  rule: AccessRule | ItemAccessRule | undefined,
  ctx: AccessContext | ItemAccessContext
): Promise<boolean> {
  if (rule === undefined) return true;
  if (typeof rule === 'boolean') return rule;
  return rule(ctx as ItemAccessContext);
}
