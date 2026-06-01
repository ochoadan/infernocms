# Access Control

InfernoCMS provides fine-grained access control at the collection level, allowing you to control who can read, create, update, and delete items.

## Configuration

Access rules are defined per-collection using the `access` option:

```typescript
export default defineConfig({
  collections: {
    posts: {
      fields: { /* ... */ },
      access: {
        read: true,
        create: (ctx) => !!ctx.user,
        update: (ctx) => ctx.user?.id === ctx.item?.authorId,
        delete: false,
      },
    },
  },
})
```

## Rule Types

Each operation can have one of three rule types:

### Boolean Rules

- `true`: Allow all requests
- `false`: Deny all requests

```typescript
access: {
  read: true,   // Anyone can read
  delete: false, // No one can delete
}
```

### Function Rules

A function that receives a context object and returns `true` (allow) or `false` (deny):

```typescript
access: {
  create: (ctx) => {
    return !!ctx.user // Must be authenticated
  },
  update: (ctx) => {
    return ctx.user?.id === ctx.item?.authorId // Must be the author
  },
}
```

## Context Object

The context object passed to function rules contains:

- **`ctx.user`**: The authenticated API token (`{ id, name, scope }`), or `null` if not authenticated
- **`ctx.item`**: The existing item being updated/deleted (only available for `update` and `delete` operations)

```typescript
access: {
  update: (ctx) => {
    // ctx.user: { id: 'tok_abc', name: 'content-pipeline', scope: 'write' }
    // ctx.item: { id: '456', authorId: '123', title: 'My Post', ... }

    return ctx.user?.id === ctx.item?.authorId
  },
}
```

> **`ctx.user` is an API token, not an end user.** InfernoCMS authenticates tokens with a `scope` (`read` / `write` / `admin`), not individual people. Scope checks like `ctx.user?.scope === 'admin'` are the native model. For per-end-user ownership ("only the author may edit"), your consuming app owns end-user identity and must supply it — InfernoCMS doesn't model users. The owner/role examples below are patterns you wire up with app-supplied identity.

## Operations

### `read`

Controls who can view items via `GET /api/{collection}` and `GET /api/{collection}/:id`.

```typescript
access: {
  read: true, // Public read access
}
```

### `create`

Controls who can create new items via `POST /api/{collection}`.

```typescript
access: {
  create: (ctx) => !!ctx.user, // Only authenticated users
}
```

### `update`

Controls who can update items via `PATCH /api/{collection}/:id`.

```typescript
access: {
  update: (ctx) => {
    // An admin-scope token, or the author (identity supplied by your app)
    return ctx.user?.scope === 'admin' || ctx.user?.id === ctx.item?.authorId
  },
}
```

### `delete`

Controls who can delete items via `DELETE /api/{collection}/:id`.

```typescript
access: {
  delete: (ctx) => ctx.user?.scope === 'admin', // Only an admin-scope token can delete
}
```

## Authentication

InfernoCMS uses **token-first bearer auth**. Every request sends `Authorization: Bearer <token>`, where the token is a first-class record with a `read`, `write`, or `admin` scope. There is no `auth` config block, no JWT signing secret, and no `X-Admin-Key` header — those were removed in the token-first overhaul. See the [Authentication guide](/guide/auth) for the full model.

```bash
GET /api/posts
Authorization: Bearer icms_...
```

In access functions, `ctx.user` is the authenticated token (`{ id, name, scope }`) or `null` for an unauthenticated request. An `admin`-scope token satisfies any rule that checks `ctx.user?.scope === 'admin'`.

## Complete Examples

### Public Read, Authenticated Write

```typescript
posts: {
  fields: { /* ... */ },
  access: {
    read: true,                    // Anyone can read
    create: (ctx) => !!ctx.user,   // Must be authenticated to create
    update: (ctx) => !!ctx.user,   // Must be authenticated to update
    delete: (ctx) => !!ctx.user,   // Must be authenticated to delete
  },
}
```

### Owner-Only Update/Delete

```typescript
posts: {
  fields: {
    title: 'text!',
    authorId: 'text!', // Store user ID
    // ...
  },
  access: {
    read: true,
    create: (ctx) => !!ctx.user,
    update: (ctx) => {
      // Only the author can update
      return ctx.user?.id === ctx.item?.authorId
    },
    delete: (ctx) => {
      // Only the author can delete
      return ctx.user?.id === ctx.item?.authorId
    },
  },
}
```

### Role-Based Access

```typescript
posts: {
  fields: { /* ... */ },
  access: {
    read: true,
    create: (ctx) => {
      // Authors and editors can create
      return ctx.user?.role === 'author' || ctx.user?.role === 'editor'
    },
    update: (ctx) => {
      // Authors can update their own, editors can update any
      if (ctx.user?.role === 'editor') return true
      if (ctx.user?.role === 'author') {
        return ctx.user.id === ctx.item?.authorId
      }
      return false
    },
    delete: (ctx) => {
      // Only editors can delete
      return ctx.user?.role === 'editor'
    },
  },
}
```

### Status-Based Access

```typescript
posts: {
  fields: {
    title: 'text!',
    status: 'select:draft,published',
    authorId: 'text!',
    // ...
  },
  access: {
    read: (ctx) => {
      // Public can only read published posts
      if (!ctx.user) {
        return ctx.item?.status === 'published'
      }
      // Authenticated users can read all
      return true
    },
    create: (ctx) => !!ctx.user,
    update: (ctx) => ctx.user?.id === ctx.item?.authorId,
    delete: (ctx) => ctx.user?.role === 'admin',
  },
}
```

### Private Collection

```typescript
apiKeys: {
  fields: {
    name: 'text!',
    key: 'text!',
    userId: 'text!',
  },
  access: {
    read: (ctx) => {
      // Users can only read their own API keys
      return ctx.user?.id === ctx.item?.userId
    },
    create: (ctx) => !!ctx.user,
    update: (ctx) => ctx.user?.id === ctx.item?.userId,
    delete: (ctx) => ctx.user?.id === ctx.item?.userId,
  },
}
```

## Best Practices

1. **Always use HTTPS in production** when transmitting bearer tokens
2. **Keep tokens secret** — store them in environment variables, never commit them
3. **Scope tokens narrowly** — hand out `read`/`write` tokens; reserve `admin` for token management
4. **Rotate and revoke tokens** when they're no longer needed (`DELETE /api/_tokens/:id`)
5. **Test access rules thoroughly** before deploying to production
