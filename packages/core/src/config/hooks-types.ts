export interface CollectionHooks {
  beforeCreate?: (ctx: { data: Record<string, unknown> }) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;
  afterCreate?: (ctx: { item: Record<string, unknown> }) => Promise<void> | void;
  beforeUpdate?: (ctx: { id: number; data: Record<string, unknown>; existing: Record<string, unknown> }) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;
  afterUpdate?: (ctx: { id: number; item: Record<string, unknown> }) => Promise<void> | void;
  beforeDelete?: (ctx: { id: number; existing: Record<string, unknown> }) => Promise<boolean | void> | boolean | void;
  afterDelete?: (ctx: { id: number }) => Promise<void> | void;
}

export interface AccessContext {
  user?: Record<string, unknown>;
}

export interface ItemAccessContext extends AccessContext {
  item: Record<string, unknown>;
}

export type AccessRule = boolean | ((ctx: AccessContext) => boolean | Promise<boolean>);
export type ItemAccessRule = boolean | ((ctx: ItemAccessContext) => boolean | Promise<boolean>);

export interface CollectionAccess {
  read?: AccessRule;
  create?: AccessRule;
  update?: ItemAccessRule;
  delete?: ItemAccessRule;
}
