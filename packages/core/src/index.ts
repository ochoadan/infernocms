// Schema
export { field } from './schema/fields.js';
export { defineConfig } from './schema/define.js';

// Config types
export type {
  InfernoCMSConfig,
  CollectionConfig,
  FieldConfig,
  FieldDefinition,
  FieldType,
  TextFieldConfig,
  TextareaFieldConfig,
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
  RichtextFieldConfig,
  BlocksFieldConfig,
  LinkFieldConfig,
  GroupFieldConfig,
  ArrayFieldConfig,
  BlockDefinition,
  NormalizedBlockConfig,
  StorageConfig,
  NormalizedConfig,
  NormalizedCollectionConfig,
  NormalizedFieldConfig,
  CollectionHooks,
  CollectionAccess,
  AccessContext,
  ItemAccessContext,
  AccessRule,
  ItemAccessRule,
  WebhookConfig,
  TimestampFieldOptions,
  TimestampsConfig,
  NormalizedTimestampsConfig,
} from './config/types.js';

// Config loading
export { loadConfig } from './config/loader.js';
export { parseConfig } from './config/parser.js';

// Database
export {
  createConnection,
  getDb,
  closeConnection,
  type ConnectionOptions,
} from './database/connection.js';
export type { DbClient, QueryResult } from './database/client.js';
export { syncTables, getTableInfo, type SyncOptions } from './database/migrator.js';
export {
  Repository,
  getRepository,
  clearRepositories,
  type FindAllOptions,
  type PaginatedResult,
} from './database/repository.js';

// API
export {
  createServer,
  startServer,
  type ServerOptions,
} from './api/server.js';
export { registerRoutes, getEndpointList } from './api/routes.js';
export {
  formatResponse,
  formatPaginatedResponse,
  formatError,
  type ApiResponse,
  type PaginatedApiResponse,
  type ErrorResponse,
} from './api/response.js';
export { type ParsedFilter } from './api/filters.js';
export { extractHooks, type HooksMap } from './api/hooks.js';
export { extractAccess, checkAccess, type AccessMap } from './api/access.js';

// Webhooks
export { dispatchWebhooks, type WebhookEvent, type WebhookPayload } from './webhooks.js';

// Services
export {
  createContentService,
  validateData,
  type ContentService,
  type ListOptions,
  type ContentServiceOptions,
  type ValidationError,
} from './services/content-service.js';

// Storage
export {
  initStorage,
  getStorage,
  type StorageDriver,
} from './storage/index.js';

// Context
export { AppContext } from './context.js';

// Auth (used by hosting platforms that bypass the CLI and call createServer directly)
export { ensureSystemTables } from './auth/system-tables.js';
export { runBootstrap, type BootstrapOptions } from './auth/bootstrap.js';
export {
  generateToken,
  hashToken,
  mintToken,
  lookupToken,
  listTokens,
  revokeToken,
  adminTokenCount,
  TOKEN_PREFIX,
  type TokenScope,
  type TokenRecord,
  type MintedToken,
} from './auth/tokens.js';
