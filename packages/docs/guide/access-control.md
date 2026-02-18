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

- **`ctx.user`**: The authenticated user from the JWT token (or `null` if not authenticated)
- **`ctx.item`**: The existing item being updated/deleted (only available for `update` and `delete` operations)

```typescript
access: {
  update: (ctx) => {
    // ctx.user: { id: '123', email: 'user@example.com', role: 'editor', ... }
    // ctx.item: { id: '456', authorId: '123', title: 'My Post', ... }

    return ctx.user?.id === ctx.item?.authorId
  },
}
```

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
    // Only the author or admins can update
    return ctx.user?.id === ctx.item?.authorId || ctx.user?.role === 'admin'
  },
}
```

### `delete`

Controls who can delete items via `DELETE /api/{collection}/:id`.

```typescript
access: {
  delete: (ctx) => ctx.user?.role === 'admin', // Only admins can delete
}
```

## Authentication

### JWT Authentication

To use user-based access control, configure a JWT secret in your config:

```typescript
export default defineConfig({
  auth: {
    secret: process.env.JWT_SECRET, // HS256 signing secret
  },
  collections: { /* ... */ },
})
```

Clients authenticate by sending a JWT token in the `Authorization` header:

```bash
GET /api/posts
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The JWT payload is decoded and available as `ctx.user` in access functions:

```json
{
  "id": "user-123",
  "email": "user@example.com",
  "role": "editor",
  "iat": 1234567890
}
```

### Admin Bypass

Configure an admin secret key for privileged access that bypasses all access rules:

```typescript
export default defineConfig({
  auth: {
    secret: process.env.JWT_SECRET,
    adminSecret: process.env.ADMIN_SECRET,
  },
})
```

Clients send the admin key via the `X-Admin-Key` header:

```bash
GET /api/posts
X-Admin-Key: your-admin-secret-key
```

Requests with a valid admin key bypass all access control rules.

## Admin UI Integration

### Saving the Admin Key

In the admin UI, navigate to **Settings** to save your admin key. Once saved, all API requests from the admin UI will include the `X-Admin-Key` header.

This allows the admin UI to bypass access rules and manage all content.

### Access Without Admin Key

If no admin key is configured or saved, the admin UI respects the access rules defined in your config. This can be useful for role-based admin access.

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

1. **Always use HTTPS in production** when transmitting JWTs
2. **Keep JWT secrets secure** - use environment variables, never commit to version control
3. **Rotate admin secrets regularly** for security
4. **Use short JWT expiration times** (e.g., 1 hour) and implement refresh tokens
5. **Validate JWTs on the backend** - never trust client-side validation alone
6. **Test access rules thoroughly** before deploying to production
7. **Use admin bypass sparingly** - prefer role-based access control when possible
