// Re-export all config types from their split modules for backwards compatibility

export type {
  FieldType,
  BaseFieldConfig,
  TextFieldConfig,
  TextareaFieldConfig,
  RichtextFieldConfig,
  NumberFieldConfig,
  BooleanFieldConfig,
  SelectFieldConfig,
  DatetimeFieldConfig,
  DateFieldConfig,
  JsonFieldConfig,
  RelationFieldConfig,
  SlugFieldConfig,
  ImageFieldConfig,
  FileFieldConfig,
  BlocksFieldConfig,
  LinkFieldConfig,
  GroupFieldConfig,
  ArrayFieldConfig,
  FieldConfig,
  FieldDefinition,
  CollectionConfig,
  BlockDefinition,
  NormalizedBlockConfig,
  NormalizedFieldConfig,
  NormalizedCollectionConfig,
  NormalizedConfig,
  InfernoCMSConfig,
  WebhookConfig,
  TimestampFieldOptions,
  TimestampsConfig,
  NormalizedTimestampsConfig,
} from './domain-types.js';

export type { AuthConfig } from './auth-types.js';

export type { StorageConfig } from './storage-types.js';

export type {
  CollectionHooks,
  AccessContext,
  ItemAccessContext,
  AccessRule,
  ItemAccessRule,
  CollectionAccess,
} from './hooks-types.js';
