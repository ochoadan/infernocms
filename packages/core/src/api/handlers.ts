import type { FastifyRequest, FastifyReply } from 'fastify';
import type { NormalizedCollectionConfig, NormalizedConfig, NormalizedBlockConfig, NormalizedFieldConfig, CollectionHooks, CollectionAccess } from '../config/types.js';
import { getRepository } from '../database/repository.js';
import { parseFilterParams } from './filters.js';
import { checkAccess } from './access.js';
import { formatResponse, formatPaginatedResponse, formatError } from './response.js';

interface ListQuerystring {
  limit?: string;
  offset?: string;
  page?: string;
  perPage?: string;
  sort?: string;
  depth?: string;
  fields?: string;
  search?: string;
  [key: string]: string | undefined;
}

interface IdParams {
  id: string;
}

interface GetQuerystring {
  depth?: string;
  fields?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  data: Record<string, unknown>;
}

function validateSubFields(
  fields: Record<string, NormalizedFieldConfig>,
  data: Record<string, unknown>,
  parentPath: string
): string[] {
  const errors: string[] = [];
  for (const [fieldName, fieldConfig] of Object.entries(fields)) {
    const value = data[fieldName];
    if (fieldConfig.required && (value === undefined || value === null || value === '')) {
      errors.push(`${parentPath}.${fieldName} is required`);
      continue;
    }
    if (value === undefined || value === null) continue;
    switch (fieldConfig.type) {
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors.push(`${parentPath}.${fieldName} must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${parentPath}.${fieldName} must be a boolean`);
        }
        break;
      case 'select':
        if (fieldConfig.options && !fieldConfig.options.includes(value as string)) {
          errors.push(`${parentPath}.${fieldName} must be one of: ${fieldConfig.options.join(', ')}`);
        }
        break;
      case 'text':
      case 'textarea':
      case 'slug':
      case 'image':
      case 'file':
      case 'datetime':
      case 'date':
        if (typeof value !== 'string') {
          errors.push(`${parentPath}.${fieldName} must be a string`);
        }
        break;
      case 'link':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`${parentPath}.${fieldName} must be a link object`);
        } else {
          const link = value as Record<string, unknown>;
          if (typeof link.url !== 'string') {
            errors.push(`${parentPath}.${fieldName}.url must be a string`);
          }
          if (link.label !== undefined && typeof link.label !== 'string') {
            errors.push(`${parentPath}.${fieldName}.label must be a string`);
          }
          if (link.target !== undefined && link.target !== '_self' && link.target !== '_blank') {
            errors.push(`${parentPath}.${fieldName}.target must be '_self' or '_blank'`);
          }
        }
        break;
    }
  }
  return errors;
}

function validateData(
  collection: NormalizedCollectionConfig,
  data: Record<string, unknown>,
  checkRequired: boolean,
  blockSchemas?: Record<string, NormalizedBlockConfig>
): ValidationResult {
  const errors: string[] = [];
  const cleaned: Record<string, unknown> = {};

  for (const [fieldName, fieldConfig] of Object.entries(collection.fields)) {
    const value = data[fieldName];

    if (checkRequired && fieldConfig.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field "${fieldName}" is required`);
      continue;
    }

    if (value === undefined) {
      continue;
    }

    if (fieldConfig.type === 'select' && fieldConfig.options && value !== null) {
      if (!fieldConfig.options.includes(value as string)) {
        errors.push(`Field "${fieldName}" must be one of: ${fieldConfig.options.join(', ')}`);
        continue;
      }
    }

    if (value !== null) {
      switch (fieldConfig.type) {
        case 'number': {
          if (typeof value !== 'number') {
            const num = Number(value);
            if (isNaN(num)) {
              errors.push(`Field "${fieldName}" must be a number`);
              continue;
            }
            cleaned[fieldName] = num;
            continue;
          }
          break;
        }
        case 'boolean': {
          if (typeof value !== 'boolean') {
            errors.push(`Field "${fieldName}" must be a boolean`);
            continue;
          }
          break;
        }
        case 'relation': {
          if (fieldConfig.many) {
            if (!Array.isArray(value)) {
              errors.push(`Field "${fieldName}" must be an array of IDs`);
              continue;
            }
            const ids = value.map(Number);
            if (ids.some(isNaN)) {
              errors.push(`Field "${fieldName}" must contain only numeric IDs`);
              continue;
            }
            cleaned[fieldName] = ids;
            continue;
          } else {
            if (typeof value !== 'number') {
              const num = Number(value);
              if (isNaN(num)) {
                errors.push(`Field "${fieldName}" must be a numeric ID`);
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
            errors.push(`Field "${fieldName}" must be a string`);
            continue;
          }
          break;
        }
        case 'link': {
          if (typeof value !== 'object' || Array.isArray(value)) {
            errors.push(`Field "${fieldName}" must be a link object`);
            continue;
          }
          const link = value as Record<string, unknown>;
          if (typeof link.url !== 'string') {
            errors.push(`Field "${fieldName}.url" must be a string`);
          }
          if (link.label !== undefined && typeof link.label !== 'string') {
            errors.push(`Field "${fieldName}.label" must be a string`);
          }
          if (link.target !== undefined && link.target !== '_self' && link.target !== '_blank') {
            errors.push(`Field "${fieldName}.target" must be '_self' or '_blank'`);
          }
          break;
        }
        case 'group': {
          if (typeof value !== 'object' || Array.isArray(value)) {
            errors.push(`Field "${fieldName}" must be an object`);
            continue;
          }
          if (fieldConfig.fields) {
            const subErrors = validateSubFields(fieldConfig.fields, value as Record<string, unknown>, fieldName);
            errors.push(...subErrors);
          }
          break;
        }
        case 'array': {
          if (!Array.isArray(value)) {
            errors.push(`Field "${fieldName}" must be an array`);
            continue;
          }
          if (fieldConfig.fields) {
            for (let i = 0; i < value.length; i++) {
              const item = value[i] as Record<string, unknown>;
              if (!item || typeof item !== 'object') {
                errors.push(`Field "${fieldName}[${i}]" must be an object`);
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
            errors.push(`Field "${fieldName}" must be an array of blocks`);
            continue;
          }
          for (let i = 0; i < value.length; i++) {
            const block = value[i] as Record<string, unknown>;
            if (!block || typeof block !== 'object') {
              errors.push(`Field "${fieldName}[${i}]" must be an object`);
              continue;
            }
            if (!block.type || typeof block.type !== 'string') {
              errors.push(`Field "${fieldName}[${i}]" must have a "type" string`);
              continue;
            }
            if (fieldConfig.allowed && fieldConfig.allowed.length > 0) {
              if (!fieldConfig.allowed.includes(block.type)) {
                errors.push(`Field "${fieldName}[${i}]" has disallowed block type "${block.type}"`);
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

export interface HandlerOptions {
  hooks?: CollectionHooks;
  access?: CollectionAccess;
}

export function createListHandler(
  collection: NormalizedCollectionConfig,
  config: NormalizedConfig,
  options?: HandlerOptions
) {
  const allowedFilterFields = new Set([
    ...Object.keys(collection.fields),
    'id', 'createdAt', 'updatedAt',
  ]);

  return async (
    request: FastifyRequest<{ Querystring: ListQuerystring }>,
    reply: FastifyReply
  ) => {
    if (options?.access?.read !== undefined) {
      const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
      const allowed = await checkAccess(options.access.read, { user });
      if (!allowed) {
        reply.status(403);
        return formatError('Access denied', 'FORBIDDEN');
      }
    }

    const repo = getRepository(collection, config);
    const { limit, offset, page, perPage, sort, depth, fields: _f, search: _s, ...rest } = request.query;

    const filterQuery: Record<string, string | undefined> = { ...rest };
    if (request.query.fields) filterQuery.fields = request.query.fields;
    if (request.query.search) filterQuery.search = request.query.search;

    const parsed = parseFilterParams(filterQuery, allowedFilterFields);

    const result = await repo.findAll({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
      sort,
      filters: parsed.filters.length > 0 ? parsed.filters : undefined,
      depth: depth ? parseInt(depth, 10) : undefined,
      fields: parsed.fields,
      search: parsed.search,
    });

    return formatPaginatedResponse(result.data, result.meta);
  };
}

export function createGetHandler(
  collection: NormalizedCollectionConfig,
  config: NormalizedConfig,
  options?: HandlerOptions
) {
  return async (
    request: FastifyRequest<{ Params: IdParams; Querystring: GetQuerystring }>,
    reply: FastifyReply
  ) => {
    if (options?.access?.read !== undefined) {
      const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
      const allowed = await checkAccess(options.access.read, { user });
      if (!allowed) {
        reply.status(403);
        return formatError('Access denied', 'FORBIDDEN');
      }
    }

    const repo = getRepository(collection, config);
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      reply.status(400);
      return formatError('Invalid ID format');
    }

    const depth = request.query.depth ? parseInt(request.query.depth, 10) : 0;
    const fields = request.query.fields?.split(',').map((f) => f.trim()).filter(Boolean);
    const item = await repo.findById(id, depth, fields);

    if (!item) {
      reply.status(404);
      return formatError('Not found', 'NOT_FOUND');
    }

    return formatResponse(item);
  };
}

export function createCreateHandler(
  collection: NormalizedCollectionConfig,
  config: NormalizedConfig,
  options?: HandlerOptions
) {
  return async (
    request: FastifyRequest<{ Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) => {
    if (options?.access?.create !== undefined) {
      const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
      const allowed = await checkAccess(options.access.create, { user });
      if (!allowed) {
        reply.status(403);
        return formatError('Access denied', 'FORBIDDEN');
      }
    }

    const repo = getRepository(collection, config);
    const validation = validateData(collection, request.body ?? {}, true, config.blocks);

    if (!validation.valid) {
      reply.status(400);
      return formatError(validation.errors.join('; '), 'VALIDATION_ERROR');
    }

    let data = validation.data;

    if (options?.hooks?.beforeCreate) {
      const result = await options.hooks.beforeCreate({ data });
      if (result) data = result;
    }

    const item = await repo.create(data);

    if (options?.hooks?.afterCreate) {
      await options.hooks.afterCreate({ item });
    }

    reply.status(201);
    return formatResponse(item);
  };
}

export function createUpdateHandler(
  collection: NormalizedCollectionConfig,
  config: NormalizedConfig,
  partial = false,
  options?: HandlerOptions
) {
  return async (
    request: FastifyRequest<{ Params: IdParams; Body: Record<string, unknown> }>,
    reply: FastifyReply
  ) => {
    const repo = getRepository(collection, config);
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      reply.status(400);
      return formatError('Invalid ID format');
    }

    // Fetch existing for access check and hooks
    const existing = await repo.findById(id);
    if (!existing) {
      reply.status(404);
      return formatError('Not found', 'NOT_FOUND');
    }

    if (options?.access?.update !== undefined) {
      const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
      const allowed = await checkAccess(options.access.update, { user, item: existing });
      if (!allowed) {
        reply.status(403);
        return formatError('Access denied', 'FORBIDDEN');
      }
    }

    const validation = validateData(collection, request.body ?? {}, !partial, config.blocks);

    if (!validation.valid) {
      reply.status(400);
      return formatError(validation.errors.join('; '), 'VALIDATION_ERROR');
    }

    let data = validation.data;

    if (options?.hooks?.beforeUpdate) {
      const result = await options.hooks.beforeUpdate({ id, data, existing });
      if (result) data = result;
    }

    const item = await repo.update(id, data, partial);

    if (!item) {
      reply.status(404);
      return formatError('Not found', 'NOT_FOUND');
    }

    if (options?.hooks?.afterUpdate) {
      await options.hooks.afterUpdate({ id, item });
    }

    return formatResponse(item);
  };
}

export function createDeleteHandler(
  collection: NormalizedCollectionConfig,
  config: NormalizedConfig,
  options?: HandlerOptions
) {
  return async (
    request: FastifyRequest<{ Params: IdParams }>,
    reply: FastifyReply
  ) => {
    const repo = getRepository(collection, config);
    const id = parseInt(request.params.id, 10);

    if (isNaN(id)) {
      reply.status(400);
      return formatError('Invalid ID format');
    }

    // Fetch existing for access check and hooks
    const existing = await repo.findById(id);
    if (!existing) {
      reply.status(404);
      return formatError('Not found', 'NOT_FOUND');
    }

    if (options?.access?.delete !== undefined) {
      const user = (request as unknown as Record<string, unknown>).user as Record<string, unknown> | undefined;
      const allowed = await checkAccess(options.access.delete, { user, item: existing });
      if (!allowed) {
        reply.status(403);
        return formatError('Access denied', 'FORBIDDEN');
      }
    }

    if (options?.hooks?.beforeDelete) {
      const result = await options.hooks.beforeDelete({ id, existing });
      if (result === false) {
        reply.status(403);
        return formatError('Deletion cancelled by hook', 'FORBIDDEN');
      }
    }

    const deleted = await repo.delete(id);

    if (!deleted) {
      reply.status(404);
      return formatError('Not found', 'NOT_FOUND');
    }

    if (options?.hooks?.afterDelete) {
      await options.hooks.afterDelete({ id });
    }

    reply.status(204);
    return;
  };
}

