import type { NormalizedFieldConfig } from '../config/types.js';
/**
 * Returns the PostgreSQL info_schema data type name (lowercase) for a field.
 * Used by schema-diff when comparing against `information_schema.columns.data_type`.
 */
export declare function pgInfoSchemaType(field: NormalizedFieldConfig): string;
/**
 * Returns the PostgreSQL DDL type name (uppercase) for a field.
 * Used by the migrator when generating CREATE TABLE / ALTER TABLE statements.
 */
export declare function pgDdlType(field: NormalizedFieldConfig): string;
//# sourceMappingURL=field-types.d.ts.map