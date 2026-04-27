import { pgInfoSchemaType, pgDdlType } from './field-types.js';
function getSystemColumns(collection) {
    const cols = new Set(['id']);
    if (collection.timestamps.createdAt.enabled)
        cols.add('createdAt');
    if (collection.timestamps.updatedAt.enabled)
        cols.add('updatedAt');
    return cols;
}
export function diffSchema(actual, config, knownCmsTables) {
    const ops = [];
    const desiredTables = new Set();
    for (const [tableName, collection] of Object.entries(config.collections)) {
        desiredTables.add(tableName);
        const tableInfo = actual.get(tableName);
        if (!tableInfo) {
            ops.push({ type: 'CreateTable', table: tableName, destructive: false });
            // Junction tables for new table
            for (const [fieldName, fieldConfig] of Object.entries(collection.fields)) {
                if (fieldConfig.type === 'relation' && fieldConfig.many && fieldConfig.collection) {
                    const junctionName = `${tableName}_${fieldName}`;
                    desiredTables.add(junctionName);
                    if (!actual.has(junctionName)) {
                        ops.push({ type: 'CreateJunctionTable', table: junctionName, destructive: false });
                    }
                }
            }
            // Indexes for new table
            if (collection.timestamps.createdAt.enabled) {
                ops.push({
                    type: 'CreateIndex',
                    table: tableName,
                    sql: `CREATE INDEX IF NOT EXISTS "idx_${tableName}_createdAt" ON "${tableName}" ("createdAt");`,
                    destructive: false,
                });
            }
            for (const [fieldName, fieldConfig] of Object.entries(collection.fields)) {
                if (fieldConfig.type === 'relation' && !fieldConfig.many) {
                    ops.push({
                        type: 'CreateIndex',
                        table: tableName,
                        sql: `CREATE INDEX IF NOT EXISTS "idx_${tableName}_${fieldName}" ON "${tableName}" ("${fieldName}");`,
                        destructive: false,
                    });
                }
            }
            continue;
        }
        // Table exists — diff columns
        const desiredColumns = new Set();
        for (const [fieldName, fieldConfig] of Object.entries(collection.fields)) {
            // Many-to-many relations use junction tables, not columns
            if (fieldConfig.type === 'relation' && fieldConfig.many) {
                const junctionName = `${tableName}_${fieldName}`;
                desiredTables.add(junctionName);
                if (!actual.has(junctionName)) {
                    ops.push({ type: 'CreateJunctionTable', table: junctionName, destructive: false });
                    // Index for junction table
                    ops.push({
                        type: 'CreateIndex',
                        table: junctionName,
                        sql: `CREATE INDEX IF NOT EXISTS "idx_${junctionName}_${fieldConfig.collection}_id" ON "${junctionName}" ("${fieldConfig.collection}_id");`,
                        destructive: false,
                    });
                }
                continue;
            }
            desiredColumns.add(fieldName);
            const colInfo = tableInfo.columns.get(fieldName);
            if (!colInfo) {
                // Column missing — add it
                const pgType = pgDdlType(fieldConfig);
                const parts = [`"${fieldName}"`, pgType];
                if (fieldConfig.type === 'slug')
                    parts.push('UNIQUE');
                if (fieldConfig.type === 'relation' && fieldConfig.collection && !fieldConfig.many) {
                    parts.push(`REFERENCES "${fieldConfig.collection}"(id) ON DELETE SET NULL`);
                }
                ops.push({
                    type: 'AddColumn',
                    table: tableName,
                    column: fieldName,
                    definition: parts.join(' '),
                    destructive: false,
                });
                // Add index for new FK column
                if (fieldConfig.type === 'relation' && !fieldConfig.many) {
                    ops.push({
                        type: 'CreateIndex',
                        table: tableName,
                        sql: `CREATE INDEX IF NOT EXISTS "idx_${tableName}_${fieldName}" ON "${tableName}" ("${fieldName}");`,
                        destructive: false,
                    });
                }
                continue;
            }
            // Column exists — check for type changes
            const desired = pgInfoSchemaType(fieldConfig);
            if (colInfo.dataType !== desired) {
                const ddlType = pgDdlType(fieldConfig);
                ops.push({
                    type: 'AlterColumn',
                    table: tableName,
                    column: fieldName,
                    sql: `ALTER TABLE "${tableName}" ALTER COLUMN "${fieldName}" TYPE ${ddlType} USING "${fieldName}"::${ddlType};`,
                    description: `Change ${fieldName} from ${colInfo.dataType} to ${desired}`,
                    destructive: true,
                });
            }
            // Check nullability changes
            const desiredNullable = !fieldConfig.required;
            if (colInfo.isNullable !== desiredNullable) {
                if (desiredNullable) {
                    // Dropping NOT NULL is safe
                    ops.push({
                        type: 'AlterColumn',
                        table: tableName,
                        column: fieldName,
                        sql: `ALTER TABLE "${tableName}" ALTER COLUMN "${fieldName}" DROP NOT NULL;`,
                        description: `Make ${fieldName} nullable`,
                        destructive: false,
                    });
                }
                else {
                    // Adding NOT NULL is destructive (may fail if existing NULLs)
                    ops.push({
                        type: 'AlterColumn',
                        table: tableName,
                        column: fieldName,
                        sql: `ALTER TABLE "${tableName}" ALTER COLUMN "${fieldName}" SET NOT NULL;`,
                        description: `Make ${fieldName} required (NOT NULL)`,
                        destructive: true,
                    });
                }
            }
            // Check unique constraint changes (only for slug fields)
            const desiredUnique = fieldConfig.type === 'slug';
            if (colInfo.isUnique !== desiredUnique) {
                if (desiredUnique) {
                    ops.push({
                        type: 'AlterColumn',
                        table: tableName,
                        column: fieldName,
                        sql: `ALTER TABLE "${tableName}" ADD CONSTRAINT "${tableName}_${fieldName}_unique" UNIQUE ("${fieldName}");`,
                        description: `Add UNIQUE constraint to ${fieldName}`,
                        destructive: false,
                    });
                }
                else {
                    ops.push({
                        type: 'AlterColumn',
                        table: tableName,
                        column: fieldName,
                        sql: `DROP INDEX IF EXISTS "${tableName}_${fieldName}_unique"; ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${tableName}_${fieldName}_unique";`,
                        description: `Remove UNIQUE constraint from ${fieldName}`,
                        destructive: true,
                    });
                }
            }
        }
        // Find columns to drop (exist in DB but not in config)
        const systemColumns = getSystemColumns(collection);
        for (const [colName] of tableInfo.columns) {
            if (systemColumns.has(colName))
                continue;
            if (desiredColumns.has(colName))
                continue;
            ops.push({
                type: 'DropColumn',
                table: tableName,
                column: colName,
                destructive: true,
            });
        }
    }
    // Find tables to drop (exist in DB but not in desired config)
    // Only propose dropping tables that are known to be CMS-managed.
    // Unknown tables (user-created, extensions, other tools) are left alone.
    for (const [tableName] of actual) {
        if (tableName.startsWith('_infernocms_'))
            continue;
        if (desiredTables.has(tableName))
            continue;
        // Only drop if we know this table was previously created by InfernoCMS
        if (knownCmsTables && !knownCmsTables.has(tableName))
            continue;
        ops.push({ type: 'DropTable', table: tableName, destructive: true });
    }
    return ops;
}
//# sourceMappingURL=schema-diff.js.map