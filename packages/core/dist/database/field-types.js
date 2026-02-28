/**
 * Canonical mapping from InfernoCMS field types to PostgreSQL info_schema
 * data type names (lowercase). Used by schema-diff for comparison.
 */
const FIELD_TYPE_TO_PG = {
    text: 'text',
    textarea: 'text',
    datetime: 'timestamp without time zone',
    date: 'date',
    select: 'text',
    number: 'real',
    boolean: 'boolean',
    json: 'jsonb',
    richtext: 'jsonb',
    relation: 'integer',
    slug: 'text',
    image: 'text',
    file: 'text',
    blocks: 'jsonb',
    link: 'jsonb',
    group: 'jsonb',
    array: 'jsonb',
};
/**
 * Returns the PostgreSQL info_schema data type name (lowercase) for a field.
 * Used by schema-diff when comparing against `information_schema.columns.data_type`.
 */
export function pgInfoSchemaType(field) {
    if (field.type === 'number' && field.integer)
        return 'integer';
    return FIELD_TYPE_TO_PG[field.type];
}
/**
 * Returns the PostgreSQL DDL type name (uppercase) for a field.
 * Used by the migrator when generating CREATE TABLE / ALTER TABLE statements.
 */
export function pgDdlType(field) {
    return pgInfoSchemaType(field).toUpperCase();
}
//# sourceMappingURL=field-types.js.map