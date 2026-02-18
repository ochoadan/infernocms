# Status Fields

InfernoCMS does not include a built-in draft/published system. Instead, you define your own status workflow using regular fields. This gives you full control over your content lifecycle.

## Defining a Status Field

Use a `select` field to create your own status workflow:

```typescript
export default defineConfig({
  collections: {
    posts: {
      fields: {
        title: field.text({ required: true }),
        slug: field.slug({ from: 'title' }),
        body: field.richtext(),
        status: field.select({
          options: ['draft', 'published', 'archived'],
          default: 'draft',
        }),
        publishedAt: field.datetime(),
      },
    },
  },
})
```

## Filtering by Status

Use standard filtering to query by status:

```bash
# Get only published items
GET /api/posts?status=published

# Get only draft items
GET /api/posts?status=draft
```

## Using Hooks for Publish Logic

Use lifecycle hooks to add custom logic when status changes:

```typescript
posts: {
  fields: {
    title: field.text({ required: true }),
    status: field.select({ options: ['draft', 'published'], default: 'draft' }),
    publishedAt: field.datetime(),
  },
  hooks: {
    beforeUpdate: async ({ data, existing }) => {
      // Auto-set publishedAt when status changes to published
      if (data.status === 'published' && existing.status !== 'published') {
        data.publishedAt = new Date().toISOString();
      }
      return data;
    },
  },
}
```

## Benefits

- **Full control**: Define any statuses you need (draft, review, published, archived, etc.)
- **No magic columns**: Every field is visible in your schema
- **Composable**: Combine with hooks and access control for custom workflows
- **Type-safe**: Status field generates proper TypeScript union types
