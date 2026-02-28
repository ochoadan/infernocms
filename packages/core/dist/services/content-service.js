import { getRepository } from '../database/repository.js';
function validateSubFields(fields, data, parentPath) {
    const errors = [];
    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
        const fullPath = `${parentPath}.${fieldName}`;
        const value = data[fieldName];
        if (fieldConfig.required && (value === undefined || value === null || value === '')) {
            errors.push({ field: fullPath, message: `${fullPath} is required` });
            continue;
        }
        if (value === undefined || value === null)
            continue;
        switch (fieldConfig.type) {
            case 'number':
                if (typeof value !== 'number' && isNaN(Number(value))) {
                    errors.push({ field: fullPath, message: `${fullPath} must be a number` });
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push({ field: fullPath, message: `${fullPath} must be a boolean` });
                }
                break;
            case 'select':
                if (fieldConfig.options && !fieldConfig.options.includes(value)) {
                    errors.push({ field: fullPath, message: `${fullPath} must be one of: ${fieldConfig.options.join(', ')}` });
                }
                break;
            case 'text':
            case 'textarea':
                if (typeof value !== 'string') {
                    errors.push({ field: fullPath, message: `${fullPath} must be a string` });
                }
                else if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
                    errors.push({ field: fullPath, message: `${fullPath} must be at most ${fieldConfig.maxLength} characters` });
                }
                break;
            case 'slug':
            case 'image':
            case 'file':
            case 'datetime':
            case 'date':
                if (typeof value !== 'string') {
                    errors.push({ field: fullPath, message: `${fullPath} must be a string` });
                }
                break;
            case 'link':
                if (typeof value !== 'object' || Array.isArray(value)) {
                    errors.push({ field: fullPath, message: `${fullPath} must be a link object` });
                }
                else {
                    const link = value;
                    if (typeof link.url !== 'string') {
                        errors.push({ field: `${fullPath}.url`, message: `${fullPath}.url must be a string` });
                    }
                    if (link.label !== undefined && typeof link.label !== 'string') {
                        errors.push({ field: `${fullPath}.label`, message: `${fullPath}.label must be a string` });
                    }
                    if (link.target !== undefined && link.target !== '_self' && link.target !== '_blank') {
                        errors.push({ field: `${fullPath}.target`, message: `${fullPath}.target must be '_self' or '_blank'` });
                    }
                }
                break;
        }
    }
    return errors;
}
export function validateData(collection, data, checkRequired, blockSchemas) {
    const errors = [];
    const cleaned = {};
    for (const [fieldName, fieldConfig] of Object.entries(collection.fields)) {
        const value = data[fieldName];
        if (checkRequired && fieldConfig.required && (value === undefined || value === null || value === '')) {
            errors.push({ field: fieldName, message: `Field "${fieldName}" is required` });
            continue;
        }
        if (value === undefined) {
            continue;
        }
        if (fieldConfig.type === 'select' && fieldConfig.options && value !== null) {
            if (!fieldConfig.options.includes(value)) {
                errors.push({ field: fieldName, message: `Field "${fieldName}" must be one of: ${fieldConfig.options.join(', ')}` });
                continue;
            }
        }
        if (value !== null) {
            switch (fieldConfig.type) {
                case 'number': {
                    if (typeof value !== 'number') {
                        const num = Number(value);
                        if (isNaN(num)) {
                            errors.push({ field: fieldName, message: `Field "${fieldName}" must be a number` });
                            continue;
                        }
                        cleaned[fieldName] = num;
                        continue;
                    }
                    break;
                }
                case 'boolean': {
                    if (typeof value !== 'boolean') {
                        errors.push({ field: fieldName, message: `Field "${fieldName}" must be a boolean` });
                        continue;
                    }
                    break;
                }
                case 'text':
                case 'textarea': {
                    if (typeof value !== 'string') {
                        errors.push({ field: fieldName, message: `Field "${fieldName}" must be a string` });
                        continue;
                    }
                    if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
                        errors.push({ field: fieldName, message: `Field "${fieldName}" must be at most ${fieldConfig.maxLength} characters` });
                        continue;
                    }
                    break;
                }
                case 'relation': {
                    if (fieldConfig.many) {
                        if (!Array.isArray(value)) {
                            errors.push({ field: fieldName, message: `Field "${fieldName}" must be an array of IDs` });
                            continue;
                        }
                        const ids = value.map(Number);
                        if (ids.some(isNaN)) {
                            errors.push({ field: fieldName, message: `Field "${fieldName}" must contain only numeric IDs` });
                            continue;
                        }
                        cleaned[fieldName] = ids;
                        continue;
                    }
                    else {
                        if (typeof value !== 'number') {
                            const num = Number(value);
                            if (isNaN(num)) {
                                errors.push({ field: fieldName, message: `Field "${fieldName}" must be a numeric ID` });
                                continue;
                            }
                            cleaned[fieldName] = num;
                            continue;
                        }
                    }
                    break;
                }
                case 'slug':
                case 'image':
                case 'file': {
                    if (typeof value !== 'string') {
                        errors.push({ field: fieldName, message: `Field "${fieldName}" must be a string` });
                        continue;
                    }
                    break;
                }
                case 'link': {
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        errors.push({ field: fieldName, message: `Field "${fieldName}" must be a link object` });
                        continue;
                    }
                    const link = value;
                    if (typeof link.url !== 'string') {
                        errors.push({ field: `${fieldName}.url`, message: `Field "${fieldName}.url" must be a string` });
                    }
                    if (link.label !== undefined && typeof link.label !== 'string') {
                        errors.push({ field: `${fieldName}.label`, message: `Field "${fieldName}.label" must be a string` });
                    }
                    if (link.target !== undefined && link.target !== '_self' && link.target !== '_blank') {
                        errors.push({ field: `${fieldName}.target`, message: `Field "${fieldName}.target" must be '_self' or '_blank'` });
                    }
                    break;
                }
                case 'group': {
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        errors.push({ field: fieldName, message: `Field "${fieldName}" must be an object` });
                        continue;
                    }
                    if (fieldConfig.fields) {
                        const subErrors = validateSubFields(fieldConfig.fields, value, fieldName);
                        errors.push(...subErrors);
                    }
                    break;
                }
                case 'array': {
                    if (!Array.isArray(value)) {
                        errors.push({ field: fieldName, message: `Field "${fieldName}" must be an array` });
                        continue;
                    }
                    if (fieldConfig.fields) {
                        for (let i = 0; i < value.length; i++) {
                            const item = value[i];
                            if (!item || typeof item !== 'object') {
                                errors.push({ field: `${fieldName}[${i}]`, message: `Field "${fieldName}[${i}]" must be an object` });
                                continue;
                            }
                            const subErrors = validateSubFields(fieldConfig.fields, item, `${fieldName}[${i}]`);
                            errors.push(...subErrors);
                        }
                    }
                    break;
                }
                case 'blocks': {
                    if (!Array.isArray(value)) {
                        errors.push({ field: fieldName, message: `Field "${fieldName}" must be an array of blocks` });
                        continue;
                    }
                    for (let i = 0; i < value.length; i++) {
                        const block = value[i];
                        if (!block || typeof block !== 'object') {
                            errors.push({ field: `${fieldName}[${i}]`, message: `Field "${fieldName}[${i}]" must be an object` });
                            continue;
                        }
                        if (!block.type || typeof block.type !== 'string') {
                            errors.push({ field: `${fieldName}[${i}]`, message: `Field "${fieldName}[${i}]" must have a "type" string` });
                            continue;
                        }
                        if (fieldConfig.allowed && fieldConfig.allowed.length > 0) {
                            if (!fieldConfig.allowed.includes(block.type)) {
                                errors.push({ field: `${fieldName}[${i}]`, message: `Field "${fieldName}[${i}]" has disallowed block type "${block.type}"` });
                                continue;
                            }
                        }
                        if (blockSchemas && blockSchemas[block.type]) {
                            const blockSchema = blockSchemas[block.type];
                            const subErrors = validateSubFields(blockSchema.fields, block, `${fieldName}[${i}]`);
                            errors.push(...subErrors);
                        }
                    }
                    break;
                }
            }
        }
        cleaned[fieldName] = value;
    }
    return { valid: errors.length === 0, errors, data: cleaned };
}
export function createContentService(collection, config, ctx) {
    const repo = ctx ? ctx.getRepository(collection) : getRepository(collection, config);
    return {
        async list(options) {
            return repo.findAll({
                limit: options.limit,
                offset: options.offset,
                page: options.page,
                perPage: options.perPage,
                sort: options.sort,
                filters: options.filters && options.filters.length > 0 ? options.filters : undefined,
                depth: options.depth,
                fields: options.fields,
                search: options.search,
            });
        },
        async get(id, depth = 0, fields) {
            return repo.findById(id, depth, fields);
        },
        async create(data, hooks) {
            let hookData = { ...data };
            if (hooks?.beforeCreate) {
                const result = await hooks.beforeCreate({ data: hookData });
                if (result)
                    hookData = result;
            }
            const validation = validateData(collection, hookData, true, config.blocks);
            if (!validation.valid) {
                return { error: validation.errors.map(e => e.message).join('; '), validationErrors: validation.errors };
            }
            const cleaned = validation.data;
            const item = await repo.create(cleaned);
            if (hooks?.afterCreate) {
                await hooks.afterCreate({ item });
            }
            return { item };
        },
        async update(id, data, partial, hooks) {
            const existing = await repo.findById(id);
            if (!existing) {
                return { item: null };
            }
            let hookData = { ...data };
            if (hooks?.beforeUpdate) {
                const result = await hooks.beforeUpdate({ id, data: hookData, existing });
                if (result)
                    hookData = result;
            }
            const validation = validateData(collection, hookData, !partial, config.blocks);
            if (!validation.valid) {
                return { error: validation.errors.map(e => e.message).join('; '), validationErrors: validation.errors };
            }
            const cleaned = validation.data;
            const item = await repo.update(id, cleaned, partial);
            if (item && hooks?.afterUpdate) {
                await hooks.afterUpdate({ id, item });
            }
            return { item };
        },
        async remove(id, hooks) {
            const existing = await repo.findById(id);
            if (!existing) {
                return { deleted: false };
            }
            if (hooks?.beforeDelete) {
                const result = await hooks.beforeDelete({ id, existing });
                if (result === false) {
                    return { deleted: false, existing, cancelled: true };
                }
            }
            const deleted = await repo.delete(id);
            if (deleted && hooks?.afterDelete) {
                await hooks.afterDelete({ id });
            }
            return { deleted, existing };
        },
    };
}
//# sourceMappingURL=content-service.js.map