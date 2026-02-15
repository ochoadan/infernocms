import { getDb } from './connection.js';
function fieldTypeToPostgres(field) {
    const typeMap = {
        text: 'TEXT',
        textarea: 'TEXT',
        datetime: 'TIMESTAMP',
        date: 'DATE',
        select: 'TEXT',
        number: field.integer ? 'INTEGER' : 'REAL',
        boolean: 'BOOLEAN',
        json: 'JSONB',
        richtext: 'JSONB',
        relation: 'INTEGER',
        slug: 'TEXT',
        image: 'TEXT',
        file: 'TEXT',
        blocks: 'JSONB',
        link: 'JSONB',
        group: 'JSONB',
        array: 'JSONB',
    };
    return typeMap[field.type];
}
function getDefaultValue(field) {
    if (field.default === undefined) {
        return null;
    }
    switch (field.type) {
        case 'text':
        case 'textarea':
        case 'select':
        case 'slug':
        case 'image':
        case 'file':
        case 'date':
        case 'datetime':
            return `'${String(field.default).replace(/'/g, "''")}'`;
        case 'boolean':
            return field.default ? 'TRUE' : 'FALSE';
        case 'number':
        case 'relation':
            return String(field.default);
        case 'json':
        case 'richtext':
        case 'blocks':
        case 'link':
        case 'group':
        case 'array':
            return `'${JSON.stringify(field.default).replace(/'/g, "''")}'::jsonb`;
        default:
            return null;
    }
}
function buildColumnDefinition(name, field) {
    const pgType = fieldTypeToPostgres(field);
    const parts = [`"${name}"`, pgType];
    if (field.required) {
        parts.push('NOT NULL');
    }
    if (field.type === 'slug') {
        parts.push('UNIQUE');
    }
    if (field.type === 'relation' && field.collection && !field.many) {
        parts.push(`REFERENCES "${field.collection}"(id) ON DELETE SET NULL`);
    }
    const defaultVal = getDefaultValue(field);
    if (defaultVal !== null) {
        parts.push(`DEFAULT ${defaultVal}`);
    }
    return parts.join(' ');
}
function buildCreateTableSQL(tableName, fields) {
    const columns = [
        'id SERIAL PRIMARY KEY',
        ...Object.entries(fields)
            .filter(([_, field]) => !(field.type === 'relation' && field.many))
            .map(([name, field]) => buildColumnDefinition(name, field)),
    ];
    columns.push('"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP', '"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    return `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${columns.join(',\n  ')}\n);`;
}
function buildJunctionTableSQL(tableName, fieldName, relatedCollection) {
    const junctionName = `${tableName}_${fieldName}`;
    return `CREATE TABLE IF NOT EXISTS "${junctionName}" (
  "${tableName}_id" INTEGER NOT NULL REFERENCES "${tableName}"(id) ON DELETE CASCADE,
  "${relatedCollection}_id" INTEGER NOT NULL REFERENCES "${relatedCollection}"(id) ON DELETE CASCADE,
  "sortOrder" INTEGER DEFAULT 0,
  PRIMARY KEY ("${tableName}_id", "${relatedCollection}_id")
);`;
}
export async function syncTables(config) {
    const db = getDb();
    // First pass: create all tables (so FK references work)
    for (const [name, collection] of Object.entries(config.collections)) {
        try {
            const sql = buildCreateTableSQL(name, collection.fields);
            await db.exec(sql);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to create table "${name}": ${message}`);
        }
    }
    // Second pass: add missing columns and create junction tables
    for (const [name, collection] of Object.entries(config.collections)) {
        try {
            const tableInfo = await getTableInfo(name);
            if (tableInfo.exists) {
                const existingColumns = new Set(tableInfo.columns);
                for (const [fieldName, fieldConfig] of Object.entries(collection.fields)) {
                    // Skip many-to-many (they use junction tables, not columns)
                    if (fieldConfig.type === 'relation' && fieldConfig.many) {
                        continue;
                    }
                    if (!existingColumns.has(fieldName)) {
                        const pgType = fieldTypeToPostgres(fieldConfig);
                        const defaultVal = getDefaultValue(fieldConfig);
                        const defaultClause = defaultVal !== null ? ` DEFAULT ${defaultVal}` : '';
                        const uniqueClause = fieldConfig.type === 'slug' ? ' UNIQUE' : '';
                        await db.exec(`ALTER TABLE "${name}" ADD COLUMN "${fieldName}" ${pgType}${uniqueClause}${defaultClause};`);
                    }
                }
            }
            // Create junction tables for many-to-many relations
            for (const [fieldName, fieldConfig] of Object.entries(collection.fields)) {
                if (fieldConfig.type === 'relation' && fieldConfig.many && fieldConfig.collection) {
                    const sql = buildJunctionTableSQL(name, fieldName, fieldConfig.collection);
                    await db.exec(sql);
                }
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to sync table "${name}": ${message}`);
        }
    }
}
export async function getTableInfo(tableName) {
    const db = getDb();
    const result = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [tableName]);
    if (result.rows.length === 0) {
        return { exists: false, columns: [] };
    }
    return {
        exists: true,
        columns: result.rows.map((row) => row.column_name),
    };
}
//# sourceMappingURL=migrator.js.map