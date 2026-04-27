const VALID_FIELD_TYPES = [
    'text',
    'textarea',
    'richtext',
    'number',
    'boolean',
    'select',
    'datetime',
    'date',
    'json',
    'relation',
    'slug',
    'image',
    'file',
    'blocks',
    'link',
    'group',
    'array',
];
function parseShorthand(shorthand) {
    const required = shorthand.endsWith('!');
    const clean = required ? shorthand.slice(0, -1) : shorthand;
    // rel:authors or rel:authors[] (many)
    if (clean.startsWith('rel:')) {
        const rest = clean.slice(4);
        const many = rest.endsWith('[]');
        const collection = many ? rest.slice(0, -2) : rest;
        return { type: 'relation', required, silent: false, collection, many };
    }
    // slug:title (generate from field)
    if (clean.startsWith('slug:')) {
        const from = clean.slice(5);
        return { type: 'slug', required, silent: false, from };
    }
    // select:draft,published (options list)
    if (clean.startsWith('select:')) {
        const optionsStr = clean.slice(7);
        if (!optionsStr) {
            throw new Error(`Shorthand "select:" must include at least one option (e.g., "select:draft,published")`);
        }
        // Options are comma-separated; colons and commas inside option values are not supported
        const options = optionsStr.split(',');
        for (const opt of options) {
            if (opt.includes(':')) {
                throw new Error(`Select option "${opt}" in shorthand "${shorthand}" contains a colon. Shorthand select options cannot contain ":" or ",". Use the verbose field.select() syntax instead.`);
            }
        }
        return { type: 'select', required, silent: false, options };
    }
    const type = clean;
    if (!VALID_FIELD_TYPES.includes(type)) {
        throw new Error(`Invalid field type in shorthand: "${shorthand}"`);
    }
    return { type, required, silent: false };
}
function normalizeField(fieldName, definition) {
    if (typeof definition === 'string') {
        return parseShorthand(definition);
    }
    if (!VALID_FIELD_TYPES.includes(definition.type)) {
        throw new Error(`Invalid field type "${definition.type}" for field "${fieldName}"`);
    }
    const normalized = {
        type: definition.type,
        required: definition.required ?? false,
        silent: definition.silent ?? false,
    };
    if (definition.default !== undefined) {
        normalized.default = definition.default;
    }
    if (definition.type === 'select' && 'options' in definition) {
        normalized.options = definition.options;
    }
    if ((definition.type === 'text' || definition.type === 'textarea') && 'maxLength' in definition) {
        normalized.maxLength = definition.maxLength;
    }
    if (definition.type === 'number' && 'integer' in definition) {
        normalized.integer = definition.integer;
    }
    if (definition.type === 'relation' && 'collection' in definition) {
        normalized.collection = definition.collection;
        if ('many' in definition) {
            normalized.many = definition.many;
        }
    }
    if (definition.type === 'slug' && 'from' in definition) {
        normalized.from = definition.from;
    }
    if (definition.type === 'blocks' && 'allowed' in definition) {
        normalized.allowed = definition.allowed;
    }
    if ((definition.type === 'group' || definition.type === 'array') && 'fields' in definition) {
        const subFields = {};
        for (const [subName, subDef] of Object.entries(definition.fields)) {
            subFields[subName] = normalizeField(subName, subDef);
        }
        normalized.fields = subFields;
    }
    return normalized;
}
function normalizeBlock(name, block) {
    const fields = {};
    for (const [fieldName, definition] of Object.entries(block.fields)) {
        fields[fieldName] = normalizeField(fieldName, definition);
    }
    return { name, fields };
}
function normalizeTimestamps(timestamps) {
    if (timestamps === false) {
        return {
            createdAt: { enabled: false, required: false },
            updatedAt: { enabled: false, required: false },
        };
    }
    if (timestamps === undefined) {
        return {
            createdAt: { enabled: true, required: false },
            updatedAt: { enabled: true, required: false },
        };
    }
    return {
        createdAt: {
            enabled: true,
            required: timestamps.createdAt?.required ?? false,
        },
        updatedAt: {
            enabled: true,
            required: timestamps.updatedAt?.required ?? false,
        },
    };
}
function getReservedFieldNames(timestamps) {
    const reserved = new Set(['id']);
    if (timestamps.createdAt.enabled)
        reserved.add('createdAt');
    if (timestamps.updatedAt.enabled)
        reserved.add('updatedAt');
    return reserved;
}
function normalizeCollection(name, collection) {
    const timestamps = normalizeTimestamps(collection.timestamps);
    const reservedNames = getReservedFieldNames(timestamps);
    const fields = {};
    for (const [fieldName, definition] of Object.entries(collection.fields)) {
        if (reservedNames.has(fieldName)) {
            const reservedList = Array.from(reservedNames).join(', ');
            throw new Error(`Field "${fieldName}" in collection "${name}" is reserved. System fields (${reservedList}) are added automatically.`);
        }
        fields[fieldName] = normalizeField(fieldName, definition);
    }
    return { name, fields, timestamps };
}
export function parseConfig(config) {
    if (!config.collections || typeof config.collections !== 'object') {
        throw new Error('Config must have a "collections" object');
    }
    const collections = {};
    for (const [name, collection] of Object.entries(config.collections)) {
        if (!collection.fields || typeof collection.fields !== 'object') {
            throw new Error(`Collection "${name}" must have a "fields" object`);
        }
        collections[name] = normalizeCollection(name, collection);
    }
    const blocks = {};
    if (config.blocks && typeof config.blocks === 'object') {
        for (const [name, block] of Object.entries(config.blocks)) {
            if (!block.fields || typeof block.fields !== 'object') {
                throw new Error(`Block "${name}" must have a "fields" object`);
            }
            blocks[name] = normalizeBlock(name, block);
        }
    }
    // Validate cross-references after all collections are parsed
    for (const [colName, col] of Object.entries(collections)) {
        for (const [fieldName, fieldConfig] of Object.entries(col.fields)) {
            // Validate relation targets
            if (fieldConfig.type === 'relation' && fieldConfig.collection) {
                if (!collections[fieldConfig.collection]) {
                    throw new Error(`Field "${fieldName}" in collection "${colName}" references collection "${fieldConfig.collection}" which does not exist`);
                }
            }
            // Validate slug.from references
            if (fieldConfig.type === 'slug' && fieldConfig.from) {
                if (!col.fields[fieldConfig.from]) {
                    throw new Error(`Field "${fieldName}" in collection "${colName}" has "from" referencing field "${fieldConfig.from}" which does not exist in this collection`);
                }
            }
        }
    }
    return {
        collections,
        blocks,
        storage: config.storage,
    };
}
//# sourceMappingURL=parser.js.map