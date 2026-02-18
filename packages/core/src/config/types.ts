export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'select'
  | 'datetime'
  | 'date'
  | 'json'
  | 'relation'
  | 'slug'
  | 'image'
  | 'file'
  | 'blocks'
  | 'link'
  | 'group'
  | 'array';

export interface BaseFieldConfig {
  type: FieldType;
  required?: boolean;
  default?: unknown;
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text';
  default?: string;
}

export interface TextareaFieldConfig extends BaseFieldConfig {
  type: 'textarea';
  default?: string;
}

export interface RichtextFieldConfig extends BaseFieldConfig {
  type: 'richtext';
  default?: unknown;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number';
  integer?: boolean;
  default?: number;
}

export interface BooleanFieldConfig extends BaseFieldConfig {
  type: 'boolean';
  default?: boolean;
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select';
  options: string[];
  default?: string;
}

export interface DatetimeFieldConfig extends BaseFieldConfig {
  type: 'datetime';
  default?: string;
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: 'date';
  default?: string;
}

export interface JsonFieldConfig extends BaseFieldConfig {
  type: 'json';
  default?: unknown;
}

export interface RelationFieldConfig extends BaseFieldConfig {
  type: 'relation';
  collection: string;
  many?: boolean;
}

export interface SlugFieldConfig extends BaseFieldConfig {
  type: 'slug';
  from?: string;
  default?: string;
}

export interface ImageFieldConfig extends BaseFieldConfig {
  type: 'image';
  default?: string;
}

export interface FileFieldConfig extends BaseFieldConfig {
  type: 'file';
  default?: string;
}

export interface BlocksFieldConfig extends BaseFieldConfig {
  type: 'blocks';
  allowed?: string[];
  default?: unknown[];
}

export interface LinkFieldConfig extends BaseFieldConfig {
  type: 'link';
}

export interface GroupFieldConfig extends BaseFieldConfig {
  type: 'group';
  fields: Record<string, FieldDefinition>;
}

export interface ArrayFieldConfig extends BaseFieldConfig {
  type: 'array';
  fields: Record<string, FieldDefinition>;
}

export type FieldConfig =
  | TextFieldConfig
  | TextareaFieldConfig
  | RichtextFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | SelectFieldConfig
  | DatetimeFieldConfig
  | DateFieldConfig
  | JsonFieldConfig
  | RelationFieldConfig
  | SlugFieldConfig
  | ImageFieldConfig
  | FileFieldConfig
  | BlocksFieldConfig
  | LinkFieldConfig
  | GroupFieldConfig
  | ArrayFieldConfig;

export type FieldDefinition = FieldConfig | string;

// Hooks
export interface CollectionHooks {
  beforeCreate?: (ctx: { data: Record<string, unknown> }) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;
  afterCreate?: (ctx: { item: Record<string, unknown> }) => Promise<void> | void;
  beforeUpdate?: (ctx: { id: number; data: Record<string, unknown>; existing: Record<string, unknown> }) => Promise<Record<string, unknown> | void> | Record<string, unknown> | void;
  afterUpdate?: (ctx: { id: number; item: Record<string, unknown> }) => Promise<void> | void;
  beforeDelete?: (ctx: { id: number; existing: Record<string, unknown> }) => Promise<boolean | void> | boolean | void;
  afterDelete?: (ctx: { id: number }) => Promise<void> | void;
}

// Access Control
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

export interface AuthConfig {
  secret?: string;
  adminSecret?: string;
}

export interface CollectionConfig {
  fields: Record<string, FieldDefinition>;
  hooks?: CollectionHooks;
  access?: CollectionAccess;
}

export interface BlockDefinition {
  fields: Record<string, FieldDefinition>;
}

export interface NormalizedBlockConfig {
  name: string;
  fields: Record<string, NormalizedFieldConfig>;
}

export interface StorageConfig {
  provider?: 'local' | 's3';
  uploadDir?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicUrl?: string;
  prefix?: string;
}

export interface InfernoCMSConfig {
  collections: Record<string, CollectionConfig>;
  blocks?: Record<string, BlockDefinition>;
  storage?: StorageConfig;
  auth?: AuthConfig;
}

export interface NormalizedFieldConfig {
  type: FieldType;
  required: boolean;
  default?: unknown;
  options?: string[];
  integer?: boolean;
  collection?: string;
  many?: boolean;
  from?: string;
  allowed?: string[];
  fields?: Record<string, NormalizedFieldConfig>;
}

export interface NormalizedCollectionConfig {
  name: string;
  fields: Record<string, NormalizedFieldConfig>;
}

export interface NormalizedConfig {
  collections: Record<string, NormalizedCollectionConfig>;
  blocks: Record<string, NormalizedBlockConfig>;
  storage?: StorageConfig;
}
