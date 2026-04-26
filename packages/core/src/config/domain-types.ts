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
  silent?: boolean;
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text';
  maxLength?: number;
  default?: string;
}

export interface TextareaFieldConfig extends BaseFieldConfig {
  type: 'textarea';
  maxLength?: number;
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

export interface TimestampFieldOptions {
  required?: boolean;
}

export interface TimestampsConfig {
  createdAt?: TimestampFieldOptions;
  updatedAt?: TimestampFieldOptions;
}

export interface CollectionConfig {
  fields: Record<string, FieldDefinition>;
  hooks?: import('./hooks-types.js').CollectionHooks;
  access?: import('./hooks-types.js').CollectionAccess;
  timestamps?: TimestampsConfig | false;
}

export interface BlockDefinition {
  fields: Record<string, FieldDefinition>;
}

export interface NormalizedBlockConfig {
  name: string;
  fields: Record<string, NormalizedFieldConfig>;
}

export interface NormalizedFieldConfig {
  type: FieldType;
  required: boolean;
  silent: boolean;
  default?: unknown;
  options?: string[];
  integer?: boolean;
  maxLength?: number;
  collection?: string;
  many?: boolean;
  from?: string;
  allowed?: string[];
  fields?: Record<string, NormalizedFieldConfig>;
}

export interface NormalizedTimestampsConfig {
  createdAt: { enabled: boolean; required: boolean };
  updatedAt: { enabled: boolean; required: boolean };
}

export interface NormalizedCollectionConfig {
  name: string;
  fields: Record<string, NormalizedFieldConfig>;
  timestamps: NormalizedTimestampsConfig;
}

export interface NormalizedConfig {
  collections: Record<string, NormalizedCollectionConfig>;
  blocks: Record<string, NormalizedBlockConfig>;
  storage?: import('./storage-types.js').StorageConfig;
}

export interface WebhookConfig {
  url: string;
  collections?: string[];
  events?: ('create' | 'update' | 'delete' | 'status_change')[];
  secret?: string;
}

export interface InfernoCMSConfig {
  collections: Record<string, CollectionConfig>;
  blocks?: Record<string, BlockDefinition>;
  storage?: import('./storage-types.js').StorageConfig;
  auth?: import('./auth-types.js').AuthConfig;
  webhooks?: WebhookConfig[];
}
