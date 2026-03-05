import { createHash } from 'node:crypto';
import type { NormalizedConfig, NormalizedFieldConfig } from '../config/types.js';
import type { DbClient } from './client.js';
import { getDb } from './connection.js';
import { diffSchema, type ColumnInfo, type TableInfo, type MigrationOp } from './schema-diff.js';
import { pgDdlType } from './field-types.js';

export interface SyncOptions {
  force?: boolean;
  dryRun?: boolean;
  db?: DbClient;
}

function getDefaultValue(field: NormalizedFieldConfig): string | null {
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

function buildColumnDefinition(
  name: string,
  field: NormalizedFieldConfig
): string {
  const pgType = pgDdlType(field);
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

function buildCreateTableSQL(
  tableName: string,
  fields: Record<string, NormalizedFieldConfig>
): string {
  const columns = [
    'id SERIAL PRIMARY KEY',
    ...Object.entries(fields)
      .filter(([_, field]) => !(field.type === 'relation' && field.many))
      .map(([name, field]) => buildColumnDefinition(name, field)),
  ];

  columns.push(
    '"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    '"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
  );

  return `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${columns.join(',\n  ')}\n);`;
}

function buildJunctionTableSQL(
  tableName: string,
  fieldName: string,
  relatedCollection: string
): string {
  const junctionName = `${tableName}_${fieldName}`;
  return `CREATE TABLE IF NOT EXISTS "${junctionName}" (
  "${tableName}_id" INTEGER NOT NULL REFERENCES "${tableName}"(id) ON DELETE CASCADE,
  "${relatedCollection}_id" INTEGER NOT NULL REFERENCES "${relatedCollection}"(id) ON DELETE CASCADE,
  "sortOrder" INTEGER DEFAULT 0,
  PRIMARY KEY ("${tableName}_id", "${relatedCollection}_id")
);`;
}

function buildIndexStatements(
  tableName: string,
  fields: Record<string, NormalizedFieldConfig>
): string[] {
  const statements: string[] = [];

  statements.push(
    `CREATE INDEX IF NOT EXISTS "idx_${tableName}_createdAt" ON "${tableName}" ("createdAt");`
  );

  for (const [fieldName, fieldConfig] of Object.entries(fields)) {
    if (fieldConfig.type === 'relation' && !fieldConfig.many) {
      statements.push(
        `CREATE INDEX IF NOT EXISTS "idx_${tableName}_${fieldName}" ON "${tableName}" ("${fieldName}");`
      );
    }
  }

  return statements;
}

function buildJunctionIndexStatements(
  tableName: string,
  fieldName: string,
  relatedCollection: string
): string[] {
  const junctionName = `${tableName}_${fieldName}`;
  return [
    `CREATE INDEX IF NOT EXISTS "idx_${junctionName}_${relatedCollection}_id" ON "${junctionName}" ("${relatedCollection}_id");`,
  ];
}

function sortKeysDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

function hashConfig(config: NormalizedConfig): string {
  const serialized = JSON.stringify(sortKeysDeep(config.collections));
  return createHash('sha256').update(serialized).digest('hex');
}

async function ensureTrackingTable(db: DbClient): Promise<void> {
  await db.exec(`CREATE TABLE IF NOT EXISTS "_infernocms_migrations" (
    id SERIAL PRIMARY KEY,
    hash TEXT NOT NULL,
    operations JSONB NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);
}

async function isAlreadyApplied(db: DbClient, hash: string): Promise<boolean> {
  // Compare against the most recent migration hash, not any hash in history.
  // This ensures that reverting to a previous config (whose hash exists in
  // history but is not the latest) still triggers a re-diff.
  const result = await db.query<{ hash: string }>(
    `SELECT hash FROM "_infernocms_migrations" ORDER BY id DESC LIMIT 1`
  );
  const latestHash = result.rows[0]?.hash;
  return latestHash === hash;
}

async function recordMigration(db: DbClient, hash: string, ops: MigrationOp[]): Promise<void> {
  const opsJson = JSON.stringify(ops.map(op => {
    const { destructive, ...rest } = op;
    return rest;
  }));
  await db.query(
    `INSERT INTO "_infernocms_migrations" (hash, operations) VALUES ($1, $2::jsonb)`,
    [hash, opsJson]
  );
}

async function getKnownCmsTables(db: DbClient): Promise<Set<string>> {
  const tables = new Set<string>();
  try {
    const result = await db.query<{ operations: MigrationOp[] }>(
      `SELECT operations FROM "_infernocms_migrations" ORDER BY id`
    );
    for (const row of result.rows) {
      const ops = typeof row.operations === 'string'
        ? JSON.parse(row.operations) as MigrationOp[]
        : row.operations;
      for (const op of ops) {
        if (op.type === 'CreateTable' || op.type === 'CreateJunctionTable') {
          tables.add(op.table);
        }
        // If a table was dropped in a past migration, remove it from known set
        if (op.type === 'DropTable') {
          tables.delete(op.table);
        }
      }
    }
  } catch {
    // Tracking table may not exist yet
  }
  return tables;
}

export async function getTableInfo(
  tableName: string,
  db?: DbClient
): Promise<{ exists: boolean; columns: string[] }> {
  const client = db ?? getDb();

  const result = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [tableName]
  );

  if (result.rows.length === 0) {
    return { exists: false, columns: [] };
  }

  return {
    exists: true,
    columns: result.rows.map((row) => row.column_name),
  };
}

async function getDetailedTableInfo(
  tableName: string,
  db: DbClient
): Promise<TableInfo | null> {
  const colResult = await db.query<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );

  if (colResult.rows.length === 0) return null;

  // Get unique constraints
  const uniqueResult = await db.query<{ column_name: string }>(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
     WHERE tc.table_name = $1
       AND tc.constraint_type = 'UNIQUE'`,
    [tableName]
  );
  const uniqueColumns = new Set(uniqueResult.rows.map(r => r.column_name));

  const columns = new Map<string, ColumnInfo>();
  for (const row of colResult.rows) {
    columns.set(row.column_name, {
      name: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
      columnDefault: row.column_default,
      isUnique: uniqueColumns.has(row.column_name),
    });
  }

  return { columns };
}

async function getAllTableNames(db: DbClient): Promise<string[]> {
  const result = await db.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  return result.rows.map(r => r.table_name);
}

export async function syncTables(config: NormalizedConfig, options: SyncOptions = {}): Promise<MigrationOp[]> {
  const db = options.db ?? getDb();
  const { force = false, dryRun = false } = options;

  // Ensure tracking table
  await ensureTrackingTable(db);

  // Hash config and check if already applied
  const hash = hashConfig(config);
  const applied = await isAlreadyApplied(db, hash);
  if (applied && !dryRun) {
    return [];
  }

  // Gather actual schema info
  const tableNames = await getAllTableNames(db);
  const actual = new Map<string, TableInfo>();
  for (const name of tableNames) {
    if (name === '_infernocms_migrations') continue;
    const info = await getDetailedTableInfo(name, db);
    if (info) actual.set(name, info);
  }

  // Gather known CMS-managed table names from previous migrations
  const knownCmsTables = await getKnownCmsTables(db);

  // Compute diff
  const allOps = diffSchema(actual, config, knownCmsTables);

  if (allOps.length === 0) {
    if (!applied) await recordMigration(db, hash, []);
    return [];
  }

  if (dryRun) {
    console.log('\n[dry-run] Planned migration operations:');
    for (const op of allOps) {
      const tag = op.destructive ? '[DESTRUCTIVE]' : '[safe]';
      switch (op.type) {
        case 'CreateTable':
          console.log(`  ${tag} Create table "${op.table}"`);
          break;
        case 'AddColumn':
          console.log(`  ${tag} Add column "${op.column}" to "${op.table}"`);
          break;
        case 'DropColumn':
          console.log(`  ${tag} Drop column "${op.column}" from "${op.table}"`);
          break;
        case 'AlterColumn':
          console.log(`  ${tag} Alter column "${op.column}" in "${op.table}": ${op.description}`);
          break;
        case 'CreateIndex':
          console.log(`  ${tag} Create index on "${op.table}"`);
          break;
        case 'CreateJunctionTable':
          console.log(`  ${tag} Create junction table "${op.table}"`);
          break;
        case 'DropTable':
          console.log(`  ${tag} Drop table "${op.table}"`);
          break;
      }
    }
    console.log('');
    return allOps;
  }

  // Separate safe vs destructive
  const safeOps = allOps.filter(op => !op.destructive);
  const destructiveOps = allOps.filter(op => op.destructive);

  // Execute all ops inside a transaction so partial failure rolls back cleanly.
  // Hash is recorded inside the same transaction — only persisted on commit.
  await db.transaction(async (tx) => {
    // Phase 1: Safe ops (create tables, add columns, indexes, junctions)
    await executeSafeOps(safeOps, config, tx);

    // Phase 2: Destructive ops only with force
    if (destructiveOps.length > 0) {
      if (force) {
        await executeDestructiveOps(destructiveOps, tx);
      } else {
        console.log('\n[migration] Skipping destructive operations (use force mode to apply):');
        for (const op of destructiveOps) {
          switch (op.type) {
            case 'DropColumn':
              console.log(`  - Would drop column "${op.column}" from "${op.table}"`);
              break;
            case 'DropTable':
              console.log(`  - Would drop table "${op.table}"`);
              break;
            case 'AlterColumn':
              console.log(`  - Would alter column "${op.column}" in "${op.table}": ${(op as Extract<MigrationOp, { type: 'AlterColumn' }>).description}`);
              break;
          }
        }
        console.log('');
      }
    }

    const executedOps = force ? allOps : safeOps;
    // Only record the hash when ALL ops were applied. If destructive ops
    // were skipped (force=false), omitting the hash ensures a later call
    // with force=true will re-diff and apply the destructive ops.
    const allOpsApplied = destructiveOps.length === 0 || force;
    if (allOpsApplied && (executedOps.length > 0 || !applied)) {
      await recordMigration(tx, hash, executedOps);
    }
  });

  return force ? allOps : safeOps;
}

async function executeSafeOps(
  ops: MigrationOp[],
  config: NormalizedConfig,
  db: DbClient
): Promise<void> {
  // Phase 1: Create tables
  for (const op of ops) {
    if (op.type === 'CreateTable') {
      const collection = config.collections[op.table];
      if (collection) {
        const sql = buildCreateTableSQL(op.table, collection.fields);
        await db.exec(sql);
      }
    }
  }

  // Phase 2: Add columns
  for (const op of ops) {
    if (op.type === 'AddColumn') {
      await db.exec(`ALTER TABLE "${op.table}" ADD COLUMN ${op.definition};`);
    }
  }

  // Phase 3: Create junction tables
  for (const op of ops) {
    if (op.type === 'CreateJunctionTable') {
      // Find the collection and field that owns this junction table
      for (const [tableName, collection] of Object.entries(config.collections)) {
        for (const [fieldName, fieldConfig] of Object.entries(collection.fields)) {
          if (fieldConfig.type === 'relation' && fieldConfig.many && fieldConfig.collection) {
            const junctionName = `${tableName}_${fieldName}`;
            if (junctionName === op.table) {
              const sql = buildJunctionTableSQL(tableName, fieldName, fieldConfig.collection);
              await db.exec(sql);
            }
          }
        }
      }
    }
  }

  // Phase 4: Create indexes
  for (const op of ops) {
    if (op.type === 'CreateIndex') {
      await db.exec(op.sql);
    }
  }
}

async function executeDestructiveOps(ops: MigrationOp[], db: DbClient): Promise<void> {
  // Drop columns first, then alter, then drop tables
  for (const op of ops) {
    if (op.type === 'DropColumn') {
      await db.exec(`ALTER TABLE "${op.table}" DROP COLUMN "${op.column}";`);
    }
  }
  for (const op of ops) {
    if (op.type === 'AlterColumn') {
      await db.exec(op.sql);
    }
  }
  for (const op of ops) {
    if (op.type === 'DropTable') {
      await db.exec(`DROP TABLE IF EXISTS "${op.table}" CASCADE;`);
    }
  }
}
