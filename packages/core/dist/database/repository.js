import { getDb } from './connection.js';
const MAX_PER_PAGE = 100;
const MAX_DEPTH = 2;
function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
export class Repository {
    tableName;
    collection;
    config;
    allowedFields;
    constructor(collection, config) {
        this.tableName = collection.name;
        this.collection = collection;
        this.config = config;
        this.allowedFields = new Set([
            ...Object.keys(collection.fields),
            'id', 'createdAt', 'updatedAt',
        ]);
    }
    async findAll(options = {}) {
        const db = getDb();
        const perPage = Math.min(options.perPage ?? options.limit ?? 10, MAX_PER_PAGE);
        const page = options.page ?? Math.floor((options.offset ?? 0) / perPage) + 1;
        const offset = options.offset ?? (page - 1) * perPage;
        const depth = Math.min(options.depth ?? 0, MAX_DEPTH);
        const where = this.buildWhereClause(options.filters, options.search);
        const orderBy = this.buildOrderByClause(options.sort);
        const countResult = await db.query(`SELECT COUNT(*) as count FROM "${this.tableName}"${where.sql}`, where.params);
        const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
        const limitIdx = where.params.length + 1;
        const offsetIdx = where.params.length + 2;
        const dataParams = [...where.params, perPage, offset];
        const selectClause = this.buildSelectClause(options.fields);
        const query = `SELECT ${selectClause} FROM "${this.tableName}"${where.sql}${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
        const result = await db.query(query, dataParams);
        let data = result.rows;
        if (depth > 0) {
            data = await Promise.all(data.map((row) => this.resolveRelations(row, depth)));
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
        const db = getDb();
        const selectClause = this.buildSelectClause(fields);
        const result = await db.query(`SELECT ${selectClause} FROM "${this.tableName}" WHERE id = $1`, [id]);
        const row = result.rows[0] ?? null;
        if (row && depth > 0) {
            return this.resolveRelations(row, Math.min(depth, MAX_DEPTH));
        }
        return row;
    }
    async create(data) {
        const db = getDb();
        const manyRelations = this.extractManyRelations(data);
        const withSlugs = await this.generateSlugs(data);
        const sanitized = this.sanitizeData(withSlugs);
        const fields = Object.keys(sanitized);
        const values = Object.values(sanitized);
        const placeholders = values.map((_, i) => `$${i + 1}`);
        const query = `INSERT INTO "${this.tableName}" (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        const result = await db.query(query, values);
        const row = result.rows[0];
        await this.saveManyRelations(row.id, manyRelations);
        return row;
    }
    async update(id, data, partial = false) {
        const db = getDb();
        if (!partial) {
            const existing = await this.findById(id);
            if (!existing)
                return null;
        }
        const manyRelations = this.extractManyRelations(data);
        const withSlugs = await this.generateSlugs(data, id);
        const sanitized = this.sanitizeData(withSlugs);
        const fields = Object.keys(sanitized);
        if (fields.length === 0 && Object.keys(manyRelations).length === 0) {
            return this.findById(id);
        }
        let row = null;
        if (fields.length > 0) {
            const setClause = fields
                .map((field, i) => `"${field}" = $${i + 1}`)
                .join(', ');
            const values = [...Object.values(sanitized), id];
            const query = `UPDATE "${this.tableName}" SET ${setClause}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`;
            const result = await db.query(query, values);
            row = result.rows[0] ?? null;
        }
        else {
            row = await this.findById(id);
        }
        if (row) {
            await this.saveManyRelations(id, manyRelations);
        }
        return row;
    }
    async delete(id) {
        const db = getDb();
        const result = await db.query(`DELETE FROM "${this.tableName}" WHERE id = $1`, [id]);
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
    async resolveRelations(row, depth) {
        if (depth <= 0)
            return row;
        const db = getDb();
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
                const jResult = await db.query(`SELECT r.* FROM "${relatedTable}" r INNER JOIN "${junctionTable}" j ON j."${relatedTable}_id" = r.id WHERE j."${this.tableName}_id" = $1 ORDER BY j."sortOrder" ASC`, [row.id]);
                if (depth > 1) {
                    const relRepo = new Repository(relatedCollectionConfig, this.config);
                    resolved[fieldName] = await Promise.all(jResult.rows.map((r) => relRepo.resolveRelations(r, depth - 1)));
                }
                else {
                    resolved[fieldName] = jResult.rows;
                }
            }
            else {
                const fkValue = row[fieldName];
                if (fkValue != null) {
                    const relResult = await db.query(`SELECT * FROM "${fieldConfig.collection}" WHERE id = $1`, [fkValue]);
                    const relatedRow = relResult.rows[0] ?? null;
                    if (relatedRow && depth > 1) {
                        const relRepo = new Repository(relatedCollectionConfig, this.config);
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
    async generateSlugs(data, existingId) {
        const result = { ...data };
        for (const [fieldName, fieldConfig] of Object.entries(this.collection.fields)) {
            if (fieldConfig.type !== 'slug')
                continue;
            if (result[fieldName] && typeof result[fieldName] === 'string') {
                const base = slugify(result[fieldName]);
                result[fieldName] = await this.ensureUniqueSlug(fieldName, base, existingId);
                continue;
            }
            if (fieldConfig.from && result[fieldConfig.from]) {
                const base = slugify(String(result[fieldConfig.from]));
                result[fieldName] = await this.ensureUniqueSlug(fieldName, base, existingId);
            }
        }
        return result;
    }
    async ensureUniqueSlug(fieldName, baseSlug, excludeId) {
        const db = getDb();
        let counter = 0;
        while (counter <= 100) {
            const candidate = counter === 0 ? baseSlug : `${baseSlug}-${counter}`;
            const params = [candidate];
            let query = `SELECT COUNT(*) as count FROM "${this.tableName}" WHERE "${fieldName}" = $1`;
            if (excludeId !== undefined) {
                query += ` AND id != $2`;
                params.push(excludeId);
            }
            const result = await db.query(query, params);
            const count = parseInt(result.rows[0]?.count ?? '0', 10);
            if (count === 0) {
                return candidate;
            }
            counter++;
        }
        return `${baseSlug}-${Date.now()}`;
    }
    async saveManyRelations(rowId, manyRelations) {
        const db = getDb();
        for (const [fieldName, ids] of Object.entries(manyRelations)) {
            const fieldConfig = this.collection.fields[fieldName];
            if (!fieldConfig || fieldConfig.type !== 'relation' || !fieldConfig.collection)
                continue;
            const junctionTable = `${this.tableName}_${fieldName}`;
            const relatedTable = fieldConfig.collection;
            await db.query(`DELETE FROM "${junctionTable}" WHERE "${this.tableName}_id" = $1`, [rowId]);
            for (let i = 0; i < ids.length; i++) {
                await db.query(`INSERT INTO "${junctionTable}" ("${this.tableName}_id", "${relatedTable}_id", "sortOrder") VALUES ($1, $2, $3)`, [rowId, ids[i], i]);
            }
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
        if (!sort) {
            return ' ORDER BY "createdAt" DESC';
        }
        const direction = sort.startsWith('-') ? 'DESC' : 'ASC';
        const field = sort.startsWith('-') ? sort.slice(1) : sort;
        if (!this.allowedFields.has(field)) {
            return ' ORDER BY "createdAt" DESC';
        }
        return ` ORDER BY "${field}" ${direction}`;
    }
}
const repositories = new Map();
export function getRepository(collection, config) {
    let repo = repositories.get(collection.name);
    if (!repo) {
        repo = new Repository(collection, config);
        repositories.set(collection.name, repo);
    }
    return repo;
}
//# sourceMappingURL=repository.js.map