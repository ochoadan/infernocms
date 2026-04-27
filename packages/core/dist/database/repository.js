import { getDb } from './connection.js';
const MAX_PER_PAGE = 100;
const MAX_DEPTH = 2;
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
const _warnedCollections = new Set();
export class Repository {
    tableName;
    collection;
    config;
    db;
    allowedFields;
    constructor(collection, config, db) {
        if (!SAFE_IDENTIFIER.test(collection.name)) {
            throw new Error(`Unsafe collection name: "${collection.name}"`);
        }
        for (const fieldName of Object.keys(collection.fields)) {
            if (!SAFE_IDENTIFIER.test(fieldName)) {
                throw new Error(`Unsafe field name in ${collection.name}: "${fieldName}"`);
            }
        }
        this.tableName = collection.name;
        this.collection = collection;
        this.config = config;
        if (!db && !_warnedCollections.has(collection.name)) {
            _warnedCollections.add(collection.name);
            console.warn(`[infernocms] Repository "${collection.name}" created without explicit db client — falling back to singleton. Pass db via AppContext for proper DI.`);
        }
        this.db = db ?? getDb();
        this.allowedFields = new Set([
            ...Object.keys(collection.fields),
            'id',
            ...(collection.timestamps.createdAt.enabled ? ['createdAt'] : []),
            ...(collection.timestamps.updatedAt.enabled ? ['updatedAt'] : []),
        ]);
    }
    async findAll(options = {}) {
        const perPage = Math.min(options.perPage ?? options.limit ?? 10, MAX_PER_PAGE);
        const page = options.page ?? Math.floor((options.offset ?? 0) / perPage) + 1;
        const offset = options.offset ?? (page - 1) * perPage;
        const depth = Math.min(options.depth ?? 0, MAX_DEPTH);
        const where = this.buildWhereClause(options.filters, options.search);
        const orderBy = this.buildOrderByClause(options.sort);
        const countResult = await this.db.query(`SELECT COUNT(*) as count FROM "${this.tableName}"${where.sql}`, where.params);
        const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
        const limitIdx = where.params.length + 1;
        const offsetIdx = where.params.length + 2;
        const dataParams = [...where.params, perPage, offset];
        const selectClause = this.buildSelectClause(options.fields);
        const query = `SELECT ${selectClause} FROM "${this.tableName}"${where.sql}${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
        const result = await this.db.query(query, dataParams);
        let data = result.rows;
        if (depth > 0) {
            data = await this.batchResolveRelations(data, depth);
        }
        return {
            data,
            meta: {
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
            },
        };
    }
    async findById(id, depth = 0, fields) {
        const selectClause = this.buildSelectClause(fields);
        const result = await this.db.query(`SELECT ${selectClause} FROM "${this.tableName}" WHERE id = $1`, [id]);
        const row = result.rows[0] ?? null;
        if (row && depth > 0) {
            return this.resolveRelations(row, Math.min(depth, MAX_DEPTH));
        }
        return row;
    }
    async create(data) {
        const manyRelations = this.extractManyRelations(data);
        return this.db.transaction(async (tx) => {
            const withSlugs = await this.generateSlugs(data, undefined, tx);
            const sanitized = this.sanitizeData(withSlugs);
            const fields = Object.keys(sanitized);
            const values = Object.values(sanitized);
            const placeholders = values.map((_, i) => `$${i + 1}`);
            const query = `INSERT INTO "${this.tableName}" (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
            const result = await tx.query(query, values);
            const row = result.rows[0];
            await this.saveManyRelations(row.id, manyRelations, tx);
            return row;
        });
    }
    async update(id, data, partial = false, options) {
        const manyRelations = this.extractManyRelations(data);
        return this.db.transaction(async (tx) => {
            if (!partial) {
                const check = await tx.query(`SELECT id FROM "${this.tableName}" WHERE id = $1`, [id]);
                if (check.rows.length === 0)
                    return null;
            }
            const withSlugs = await this.generateSlugs(data, id, tx);
            const sanitized = this.sanitizeData(withSlugs);
            const fields = Object.keys(sanitized);
            if (fields.length === 0 && Object.keys(manyRelations).length === 0) {
                // Use tx to stay within the transaction snapshot
                const result = await tx.query(`SELECT * FROM "${this.tableName}" WHERE id = $1`, [id]);
                return result.rows[0] ?? null;
            }
            let row = null;
            if (fields.length > 0) {
                const setClause = fields
                    .map((field, i) => `"${field}" = $${i + 1}`)
                    .join(', ');
                const values = [...Object.values(sanitized), id];
                const bumpTimestamp = !options?.skipTimestamp
                    && this.collection.timestamps.updatedAt.enabled;
                const timestampClause = bumpTimestamp ? ', "updatedAt" = CURRENT_TIMESTAMP' : '';
                const query = `UPDATE "${this.tableName}" SET ${setClause}${timestampClause} WHERE id = $${values.length} RETURNING *`;
                const result = await tx.query(query, values);
                row = result.rows[0] ?? null;
            }
            else {
                // Use tx to stay within the transaction snapshot
                const result = await tx.query(`SELECT * FROM "${this.tableName}" WHERE id = $1`, [id]);
                row = result.rows[0] ?? null;
            }
            if (row) {
                await this.saveManyRelations(id, manyRelations, tx);
            }
            return row;
        });
    }
    async delete(id) {
        // Junction tables have ON DELETE CASCADE, so deleting the parent row
        // automatically cleans up all junction entries.
        const result = await this.db.query(`DELETE FROM "${this.tableName}" WHERE id = $1`, [id]);
        return (result.affectedRows ?? 0) > 0;
    }
    buildSelectClause(fields) {
        if (!fields || fields.length === 0)
            return '*';
        const safe = fields.filter((f) => this.allowedFields.has(f));
        if (!safe.includes('id'))
            safe.unshift('id');
        return safe.map((f) => `"${f}"`).join(', ');
    }
    async batchResolveRelations(rows, depth) {
        if (depth <= 0 || rows.length === 0)
            return rows;
        const resolved = rows.map((row) => ({ ...row }));
        for (const [fieldName, fieldConfig] of Object.entries(this.collection.fields)) {
            if (fieldConfig.type !== 'relation' || !fieldConfig.collection)
                continue;
            const relatedCollectionConfig = this.config.collections[fieldConfig.collection];
            if (!relatedCollectionConfig)
                continue;
            if (fieldConfig.many) {
                // For many-to-many, batch fetch all junction rows for all parent IDs
                const parentIds = resolved.map((r) => r.id).filter((id) => id != null);
                if (parentIds.length === 0)
                    continue;
                const junctionTable = `${this.tableName}_${fieldName}`;
                const relatedTable = fieldConfig.collection;
                const placeholders = parentIds.map((_, i) => `$${i + 1}`).join(', ');
                const jResult = await this.db.query(`SELECT j."${this.tableName}_id" as __parent_id, r.* FROM "${relatedTable}" r INNER JOIN "${junctionTable}" j ON j."${relatedTable}_id" = r.id WHERE j."${this.tableName}_id" IN (${placeholders}) ORDER BY j."sortOrder" ASC`, parentIds);
                // Group results by parent ID
                const grouped = new Map();
                for (const row of jResult.rows) {
                    const parentId = row.__parent_id;
                    delete row.__parent_id;
                    if (!grouped.has(parentId))
                        grouped.set(parentId, []);
                    grouped.get(parentId).push(row);
                }
                if (depth > 1) {
                    const relRepo = new Repository(relatedCollectionConfig, this.config, this.db);
                    const allRelated = jResult.rows.map((r) => {
                        const copy = { ...r };
                        delete copy.__parent_id;
                        return copy;
                    });
                    const resolvedRelated = await relRepo.batchResolveRelations(allRelated.filter((r, i, arr) => arr.findIndex((a) => a.id === r.id) === i), depth - 1);
                    const resolvedMap = new Map(resolvedRelated.map((r) => [r.id, r]));
                    for (const row of resolved) {
                        const related = grouped.get(row.id) || [];
                        row[fieldName] = related.map((r) => resolvedMap.get(r.id) || r);
                    }
                }
                else {
                    for (const row of resolved) {
                        row[fieldName] = grouped.get(row.id) || [];
                    }
                }
            }
            else {
                // For single relations, collect all FK values and batch fetch
                const fkValues = resolved
                    .map((r) => r[fieldName])
                    .filter((v) => v != null);
                const uniqueFks = [...new Set(fkValues)];
                if (uniqueFks.length === 0)
                    continue;
                const placeholders = uniqueFks.map((_, i) => `$${i + 1}`).join(', ');
                const relResult = await this.db.query(`SELECT * FROM "${fieldConfig.collection}" WHERE id IN (${placeholders})`, uniqueFks);
                let lookupMap;
                if (depth > 1) {
                    const relRepo = new Repository(relatedCollectionConfig, this.config, this.db);
                    const resolvedRelated = await relRepo.batchResolveRelations(relResult.rows, depth - 1);
                    lookupMap = new Map(resolvedRelated.map((r) => [r.id, r]));
                }
                else {
                    lookupMap = new Map(relResult.rows.map((r) => [r.id, r]));
                }
                for (const row of resolved) {
                    const fkValue = row[fieldName];
                    if (fkValue != null) {
                        row[fieldName] = lookupMap.get(fkValue) ?? null;
                    }
                }
            }
        }
        return resolved;
    }
    async resolveRelations(row, depth) {
        if (depth <= 0)
            return row;
        const resolved = { ...row };
        for (const [fieldName, fieldConfig] of Object.entries(this.collection.fields)) {
            if (fieldConfig.type !== 'relation' || !fieldConfig.collection)
                continue;
            const relatedCollectionConfig = this.config.collections[fieldConfig.collection];
            if (!relatedCollectionConfig)
                continue;
            if (fieldConfig.many) {
                const junctionTable = `${this.tableName}_${fieldName}`;
                const relatedTable = fieldConfig.collection;
                const jResult = await this.db.query(`SELECT r.* FROM "${relatedTable}" r INNER JOIN "${junctionTable}" j ON j."${relatedTable}_id" = r.id WHERE j."${this.tableName}_id" = $1 ORDER BY j."sortOrder" ASC`, [row.id]);
                if (depth > 1) {
                    const relRepo = new Repository(relatedCollectionConfig, this.config, this.db);
                    resolved[fieldName] = await Promise.all(jResult.rows.map((r) => relRepo.resolveRelations(r, depth - 1)));
                }
                else {
                    resolved[fieldName] = jResult.rows;
                }
            }
            else {
                const fkValue = row[fieldName];
                if (fkValue != null) {
                    const relResult = await this.db.query(`SELECT * FROM "${fieldConfig.collection}" WHERE id = $1`, [fkValue]);
                    const relatedRow = relResult.rows[0] ?? null;
                    if (relatedRow && depth > 1) {
                        const relRepo = new Repository(relatedCollectionConfig, this.config, this.db);
                        resolved[fieldName] = await relRepo.resolveRelations(relatedRow, depth - 1);
                    }
                    else {
                        resolved[fieldName] = relatedRow;
                    }
                }
            }
        }
        return resolved;
    }
    extractManyRelations(data) {
        const manyRelations = {};
        for (const [fieldName, fieldConfig] of Object.entries(this.collection.fields)) {
            if (fieldConfig.type === 'relation' && fieldConfig.many && data[fieldName] !== undefined) {
                const ids = data[fieldName];
                if (Array.isArray(ids)) {
                    manyRelations[fieldName] = ids.map(Number).filter((n) => !isNaN(n));
                }
            }
        }
        return manyRelations;
    }
    async generateSlugs(data, existingId, client) {
        const result = { ...data };
        const db = client ?? this.db;
        for (const [fieldName, fieldConfig] of Object.entries(this.collection.fields)) {
            if (fieldConfig.type !== 'slug')
                continue;
            if (result[fieldName] && typeof result[fieldName] === 'string') {
                const base = slugify(result[fieldName]);
                result[fieldName] = await this.ensureUniqueSlug(fieldName, base, db, existingId);
                continue;
            }
            if (fieldConfig.from && result[fieldConfig.from]) {
                const base = slugify(String(result[fieldConfig.from]));
                result[fieldName] = await this.ensureUniqueSlug(fieldName, base, db, existingId);
            }
        }
        return result;
    }
    async ensureUniqueSlug(fieldName, baseSlug, client, excludeId) {
        let counter = 0;
        while (counter <= 100) {
            const candidate = counter === 0 ? baseSlug : `${baseSlug}-${counter}`;
            const params = [candidate];
            let query = `SELECT COUNT(*) as count FROM "${this.tableName}" WHERE "${fieldName}" = $1`;
            if (excludeId !== undefined) {
                query += ` AND id != $2`;
                params.push(excludeId);
            }
            const result = await client.query(query, params);
            const count = parseInt(result.rows[0]?.count ?? '0', 10);
            if (count === 0) {
                return candidate;
            }
            counter++;
        }
        return `${baseSlug}-${Date.now()}`;
    }
    async saveManyRelations(rowId, manyRelations, tx) {
        const client = tx;
        for (const [fieldName, ids] of Object.entries(manyRelations)) {
            const fieldConfig = this.collection.fields[fieldName];
            if (!fieldConfig || fieldConfig.type !== 'relation' || !fieldConfig.collection)
                continue;
            const junctionTable = `${this.tableName}_${fieldName}`;
            const relatedTable = fieldConfig.collection;
            await client.query(`DELETE FROM "${junctionTable}" WHERE "${this.tableName}_id" = $1`, [rowId]);
            if (ids.length === 0)
                continue;
            // Multi-row INSERT for all junction entries
            const valueClauses = [];
            const params = [];
            for (let i = 0; i < ids.length; i++) {
                const offset = i * 3;
                valueClauses.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
                params.push(rowId, ids[i], i);
            }
            await client.query(`INSERT INTO "${junctionTable}" ("${this.tableName}_id", "${relatedTable}_id", "sortOrder") VALUES ${valueClauses.join(', ')}`, params);
        }
    }
    sanitizeData(data) {
        const schemaFields = new Set(Object.keys(this.collection.fields));
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (!schemaFields.has(key))
                continue;
            const fieldConfig = this.collection.fields[key];
            if (fieldConfig?.type === 'relation' && fieldConfig.many)
                continue;
            sanitized[key] = value;
        }
        return sanitized;
    }
    buildWhereClause(filters, search) {
        const params = [];
        const conditions = [];
        if (filters && filters.length > 0) {
            for (const filter of filters) {
                if (!this.allowedFields.has(filter.field))
                    continue;
                switch (filter.operator) {
                    case 'eq':
                        if (filter.value === null) {
                            conditions.push(`"${filter.field}" IS NULL`);
                        }
                        else {
                            params.push(filter.value);
                            conditions.push(`"${filter.field}" = $${params.length}`);
                        }
                        break;
                    case 'ne':
                        if (filter.value === null) {
                            conditions.push(`"${filter.field}" IS NOT NULL`);
                        }
                        else {
                            params.push(filter.value);
                            conditions.push(`"${filter.field}" != $${params.length}`);
                        }
                        break;
                    case 'gt':
                        params.push(filter.value);
                        conditions.push(`"${filter.field}" > $${params.length}`);
                        break;
                    case 'gte':
                        params.push(filter.value);
                        conditions.push(`"${filter.field}" >= $${params.length}`);
                        break;
                    case 'lt':
                        params.push(filter.value);
                        conditions.push(`"${filter.field}" < $${params.length}`);
                        break;
                    case 'lte':
                        params.push(filter.value);
                        conditions.push(`"${filter.field}" <= $${params.length}`);
                        break;
                    case 'contains':
                        params.push(`%${filter.value}%`);
                        conditions.push(`"${filter.field}" ILIKE $${params.length}`);
                        break;
                    case 'startsWith':
                        params.push(`${filter.value}%`);
                        conditions.push(`"${filter.field}" ILIKE $${params.length}`);
                        break;
                    case 'endsWith':
                        params.push(`%${filter.value}`);
                        conditions.push(`"${filter.field}" ILIKE $${params.length}`);
                        break;
                    case 'in': {
                        const values = filter.value;
                        if (values.length > 0) {
                            const placeholders = values.map((v) => {
                                params.push(v);
                                return `$${params.length}`;
                            });
                            conditions.push(`"${filter.field}" IN (${placeholders.join(', ')})`);
                        }
                        break;
                    }
                }
            }
        }
        if (search) {
            const textFields = [];
            for (const [name, field] of Object.entries(this.collection.fields)) {
                if (field.type === 'text' || field.type === 'textarea') {
                    textFields.push(name);
                }
            }
            if (textFields.length > 0) {
                params.push(`%${search}%`);
                const paramIdx = params.length;
                const orClauses = textFields.map((f) => `"${f}" ILIKE $${paramIdx}`);
                conditions.push(`(${orClauses.join(' OR ')})`);
            }
        }
        if (conditions.length === 0) {
            return { sql: '', params: [] };
        }
        return {
            sql: ` WHERE ${conditions.join(' AND ')}`,
            params,
        };
    }
    buildOrderByClause(sort) {
        const defaultSort = this.collection.timestamps.createdAt.enabled
            ? ' ORDER BY "createdAt" DESC'
            : ' ORDER BY "id" DESC';
        if (!sort) {
            return defaultSort;
        }
        const direction = sort.startsWith('-') ? 'DESC' : 'ASC';
        const field = sort.startsWith('-') ? sort.slice(1) : sort;
        if (!this.allowedFields.has(field)) {
            return defaultSort;
        }
        return ` ORDER BY "${field}" ${direction}`;
    }
}
/**
 * Create a repository instance. No module-level caching — use AppContext
 * for caching across handler lifetimes.
 */
export function getRepository(collection, config, db) {
    return new Repository(collection, config, db);
}
/** @deprecated No-op. Repository caching is now handled by AppContext. */
export function clearRepositories() {
    // Intentionally empty — kept for backward compatibility.
    // Use AppContext.clearRepositories() instead.
}
//# sourceMappingURL=repository.js.map