import type {
  InfernoCMSConfig,
  FieldDefinition,
  NormalizedConfig,
  NormalizedCollectionConfig,
  NormalizedFieldConfig,
  NormalizedBlockConfig,
  FieldType,
  CollectionConfig,
  BlockDefinition,
} from './types.js';

const VALID_FIELD_TYPES: FieldType[] = [
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

function parseShorthand(shorthand: string): NormalizedFieldConfig {
  const required = shorthand.endsWith('!');
  const clean = required ? shorthand.slice(0, -1) : shorthand;

  // rel:authors or rel:authors[] (many)
  if (clean.startsWith('rel:')) {
    const rest = clean.slice(4);
    const many = rest.endsWith('[]');
    const collection = many ? rest.slice(0, -2) : rest;
    return { type: 'relation', required, collection, many };
  }

  // slug:title (generate from field)
  if (clean.startsWith('slug:')) {
    const from = clean.slice(5);
    return { type: 'slug', required, from };
  }

  const type = clean as FieldType;

  if (!VALID_FIELD_TYPES.includes(type)) {
    throw new Error(`Invalid field type in shorthand: "${shorthand}"`);
  }

  return { type, required };
}

function normalizeField(
  fieldName: string,
  definition: FieldDefinition
): NormalizedFieldConfig {
  if (typeof definition === 'string') {
    return parseShorthand(definition);
  }

  if (!VALID_FIELD_TYPES.includes(definition.type)) {
    throw new Error(
      `Invalid field type "${definition.type}" for field "${fieldName}"`
    );
  }

  const normalized: NormalizedFieldConfig = {
    type: definition.type,
    required: definition.required ?? false,
  };

  if (definition.default !== undefined) {
    normalized.default = definition.default;
  }

  if (definition.type === 'select' && 'options' in definition) {
    normalized.options = definition.options;
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
    normalized.allowed = (definition as { allowed?: string[] }).allowed;
  }

  if ((definition.type === 'group' || definition.type === 'array') && 'fields' in definition) {
    const subFields: Record<string, NormalizedFieldConfig> = {};
    for (const [subName, subDef] of Object.entries(
      (definition as { fields: Record<string, FieldDefinition> }).fields
    )) {
      subFields[subName] = normalizeField(subName, subDef);
    }
    normalized.fields = subFields;
  }

  return normalized;
}

function normalizeBlock(
  name: string,
  block: BlockDefinition
): NormalizedBlockConfig {
  const fields: Record<string, NormalizedFieldConfig> = {};
  for (const [fieldName, definition] of Object.entries(block.fields)) {
    fields[fieldName] = normalizeField(fieldName, definition);
  }
  return { name, fields };
}

function normalizeCollection(
  name: string,
  collection: CollectionConfig
): NormalizedCollectionConfig {
  const fields: Record<string, NormalizedFieldConfig> = {};

  for (const [fieldName, definition] of Object.entries(collection.fields)) {
    fields[fieldName] = normalizeField(fieldName, definition);
  }

  return { name, fields };
}

export function parseConfig(config: InfernoCMSConfig): NormalizedConfig {
  if (!config.collections || typeof config.collections !== 'object') {
    throw new Error('Config must have a "collections" object');
  }

  const collections: Record<string, NormalizedCollectionConfig> = {};

  for (const [name, collection] of Object.entries(config.collections)) {
    if (!collection.fields || typeof collection.fields !== 'object') {
      throw new Error(`Collection "${name}" must have a "fields" object`);
    }
    collections[name] = normalizeCollection(name, collection);
  }

  const blocks: Record<string, NormalizedBlockConfig> = {};
  if (config.blocks && typeof config.blocks === 'object') {
    for (const [name, block] of Object.entries(config.blocks)) {
      if (!block.fields || typeof block.fields !== 'object') {
        throw new Error(`Block "${name}" must have a "fields" object`);
      }
      blocks[name] = normalizeBlock(name, block);
    }
  }

  return {
    collections,
    blocks,
    storage: config.storage,
  };
}
