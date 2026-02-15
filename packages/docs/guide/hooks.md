# Lifecycle Hooks

Lifecycle hooks allow you to run custom logic before or after create, update, and delete operations on your collections.

## Defining Hooks

Hooks are defined per-collection in your `content.config.ts`:

```typescript
export default defineConfig({
  collections: {
    posts: {
      fields: { /* ... */ },
      hooks: {
        beforeCreate: async ({ data }) => { /* ... */ },
        afterCreate: async ({ item }) => { /* ... */ },
        beforeUpdate: async ({ id, data, existing }) => { /* ... */ },
        afterUpdate: async ({ id, item }) => { /* ... */ },
        beforeDelete: async ({ id, existing }) => { /* ... */ },
        afterDelete: async ({ id }) => { /* ... */ },
      },
    },
  },
})
```

## Available Hooks

### `beforeCreate`

Runs before a new item is created. Receives `{ data }` and must return the data (modified or unchanged).

```typescript
beforeCreate: async ({ data }) => {
  // Auto-generate excerpt from body
  if (data.body && !data.excerpt) {
    data.excerpt = data.body.substring(0, 200) + '...'
  }
  return data
}
```

**Use cases:**
- Auto-generating fields
- Validating data
- Setting defaults
- Transforming input

### `afterCreate`

Runs after a new item is created. Receives `{ item }` (including generated `id`).

```typescript
afterCreate: async ({ item }) => {
  // Log creation
  console.log(`New post created: ${item.id}`)

  // Send notification
  await sendEmail({
    to: 'admin@example.com',
    subject: `New post: ${item.title}`,
  })
}
```

**Use cases:**
- Logging
- Sending notifications
- Triggering webhooks
- Updating external systems

### `beforeUpdate`

Runs before an item is updated. Receives `{ id, data, existing }` and must return the data.

- `id` — the item's ID
- `data` — the incoming update data
- `existing` — the current item before the update

```typescript
beforeUpdate: async ({ id, data, existing }) => {
  // Update timestamp
  data.updatedAt = new Date().toISOString()

  // Validate status transition
  if (data.status === 'published' && !existing.coverImage && !data.coverImage) {
    throw new Error('Cannot publish post without cover image')
  }

  return data
}
```

**Use cases:**
- Validating changes
- Comparing old vs new values
- Updating computed fields
- Enforcing business rules

### `afterUpdate`

Runs after an item is updated. Receives `{ id, item }`.

```typescript
afterUpdate: async ({ id, item }) => {
  // Invalidate cache
  await cache.del(`post:${id}`)

  // Trigger webhook
  if (item.status === 'published') {
    await fetch('https://example.com/webhook', {
      method: 'POST',
      body: JSON.stringify({ event: 'post.updated', data: item }),
    })
  }
}
```

**Use cases:**
- Cache invalidation
- Webhooks
- Search index updates
- Notifications

### `beforeDelete`

Runs before an item is deleted. Receives `{ id, existing }`.

- `id` — the item's ID
- `existing` — the current item about to be deleted

Return `false` to cancel the deletion (responds with 403 Forbidden):

```typescript
beforeDelete: async ({ id, existing }) => {
  // Prevent deletion of published posts
  if (existing.status === 'published') {
    return false
  }

  // Allow deletion
  return true
}
```

**Use cases:**
- Preventing deletion based on conditions
- Cleaning up related data
- Soft deletes

### `afterDelete`

Runs after an item is deleted. Receives `{ id }` only (the item data is no longer available).

```typescript
afterDelete: async ({ id }) => {
  // Log deletion
  console.log(`Post deleted: ${id}`)

  // Notify webhook
  await fetch('https://example.com/webhook', {
    method: 'POST',
    body: JSON.stringify({ event: 'post.deleted', id }),
  })
}
```

**Use cases:**
- Cleanup
- Logging
- Notifications

## Async Support

All hooks support async/await:

```typescript
hooks: {
  afterCreate: async ({ item }) => {
    await fetch('https://api.example.com/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
  },
}
```

## Complete Example

```typescript
export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: 'text!',
        slug: 'slug:title',
        body: 'richtext',
        excerpt: 'textarea',
        coverImage: 'image',
        wordCount: 'number',
        views: 'number',
        status: 'select:draft,published',
      },
      hooks: {
        beforeCreate: async ({ data }) => {
          // Auto-generate excerpt if not provided
          if (!data.excerpt && data.body) {
            const plainText = data.body.replace(/<[^>]*>/g, '')
            data.excerpt = plainText.substring(0, 200) + '...'
          }

          // Calculate word count
          if (data.body) {
            const words = data.body.split(/\s+/).length
            data.wordCount = words
          }

          // Initialize views
          data.views = 0

          return data
        },

        afterCreate: async ({ item }) => {
          // Send notification to team
          await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            body: JSON.stringify({
              text: `New post created: "${item.title}" by ${item.author}`,
            }),
          })
        },

        beforeUpdate: async ({ id, data, existing }) => {
          // Recalculate word count if body changed
          if (data.body) {
            const words = data.body.split(/\s+/).length
            data.wordCount = words
          }

          // Validate publishing requirements
          if (data.status === 'published') {
            const coverImage = data.coverImage ?? existing.coverImage
            const excerpt = data.excerpt ?? existing.excerpt
            if (!coverImage) {
              throw new Error('Cover image is required for published posts')
            }
            if (!excerpt) {
              throw new Error('Excerpt is required for published posts')
            }
          }

          return data
        },

        afterUpdate: async ({ id, item }) => {
          // Clear cache
          await cache.del(`post:${item.slug}`)

          // Trigger build webhook when published
          if (item.status === 'published') {
            await fetch(process.env.BUILD_WEBHOOK_URL, {
              method: 'POST',
            })
          }
        },

        beforeDelete: async ({ id, existing }) => {
          // Prevent deletion of published posts
          if (existing.status === 'published') {
            console.log('Cannot delete published post:', id)
            return false
          }
          return true
        },

        afterDelete: async ({ id }) => {
          // Log deletion
          console.log('Post deleted:', {
            id,
            deletedAt: new Date().toISOString(),
          })
        },
      },
    },
  },
})
```

## Error Handling

If a hook throws an error, the operation will fail and return a 500 error:

```typescript
beforeCreate: async ({ data }) => {
  if (!data.title || data.title.length < 5) {
    throw new Error('Title must be at least 5 characters')
  }
  return data
}
```

For `beforeDelete`, returning `false` cancels the deletion with a 403 error:

```typescript
beforeDelete: async ({ id, existing }) => {
  if (existing.protected) {
    return false // Cancels deletion, returns 403
  }
  return true // Allows deletion
}
```
