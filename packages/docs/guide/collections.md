# Collections

Collections are content types in InfernoCMS. Each collection represents a database table and gets its own REST API endpoints.

## Defining Collections

Collections are defined in your `content.config.ts`:

```typescript
export default defineConfig({
  collections: {
    posts: {
      fields: { /* ... */ },
    },
    authors: {
      fields: { /* ... */ },
    },
  },
})
```

Each collection automatically gets:
- A database table
- REST API endpoints at `/api/{collection}`
- Admin UI pages for managing content

## Field Definitions

Fields can be defined using either shorthand strings or full object syntax.

### Shorthand Syntax

Quick and concise for common field configurations:

```typescript
fields: {
  title: 'text!',              // Required text field
  slug: 'slug:title',          // Slug generated from title
  bio: 'textarea',             // Multi-line text
  body: 'richtext',            // Rich text editor
  coverImage: 'image',         // Image upload
  author: 'rel:authors',       // Relation to authors collection
  tags: 'rel:tags[]',          // Many-to-many relation
  published: 'boolean',        // Boolean/checkbox
  website: 'link',             // Link field
}
```

**Shorthand syntax:**
- Add `!` suffix for required fields: `'text!'`
- For slug fields, specify source: `'slug:sourceField'`
- For relations, specify collection: `'rel:collection'`
- For many relations, add `[]`: `'rel:collection[]'`

### Full Object Syntax

More control with explicit options:

```typescript
fields: {
  title: field.text({ required: true }),
  slug: field.slug({ from: 'title', required: true }),
  status: field.select({
    options: ['draft', 'review', 'published'],
    default: 'draft',
  }),
  publishDate: field.datetime(),
  author: field.relation({ collection: 'authors', required: true }),
  tags: field.relation({ collection: 'tags', many: true }),
  cta: field.link(),
  seo: field.group({
    fields: {
      title: field.text(),
      description: field.textarea(),
    }
  }),
}
```

### Mixing Syntaxes

You can mix both styles in the same collection:

```typescript
fields: {
  title: 'text!',              // Shorthand
  slug: 'slug:title',          // Shorthand
  status: field.select({       // Full object
    options: ['draft', 'published'],
    default: 'draft',
  }),
  body: 'richtext',            // Shorthand
  author: 'rel:authors',       // Shorthand
}
```

## Block Schemas

Define typed block schemas at the top level of your config for use with `blocks` fields:

```typescript
export default defineConfig({
  blocks: {
    hero: {
      fields: {
        heading: field.text({ required: true }),
        image: field.image(),
        cta: field.link(),
      }
    },
    richtext: {
      fields: {
        content: field.richtext(),
      }
    },
  },
  collections: {
    pages: {
      fields: {
        content: field.blocks({ allowed: ['hero', 'richtext'] }),
      }
    }
  }
});
```

See [Blocks Field](/fields/blocks) for details.

## Collection Options

### `hooks`

Add lifecycle hooks for custom logic:

```typescript
posts: {
  fields: { /* ... */ },
  hooks: {
    beforeCreate: async ({ data }) => {
      data.excerpt = data.body.substring(0, 200)
      return data
    },
    afterCreate: async ({ item }) => {
      console.log('New post created:', item.id)
    },
  },
}
```

See [Lifecycle Hooks](/guide/hooks) for more information.

### `access`

Control who can read, create, update, and delete items:

```typescript
posts: {
  fields: { /* ... */ },
  access: {
    read: true,                    // Public read
    create: (ctx) => !!ctx.user,   // Authenticated users can create
    update: (ctx) => {              // Only author can update
      return ctx.user?.id === ctx.item?.authorId
    },
    delete: false,                 // No one can delete
  },
}
```

See [Access Control](/guide/access-control) for details.

## Complete Example

```typescript
export default defineConfig({
  blocks: {
    hero: {
      fields: {
        heading: field.text({ required: true }),
        image: field.image(),
      }
    },
  },
  collections: {
    posts: {
      fields: {
        title: 'text!',
        slug: 'slug:title',
        status: field.select({
          options: ['draft', 'review', 'published'],
          default: 'draft',
        }),
        excerpt: 'textarea',
        body: 'richtext',
        coverImage: 'image',
        author: 'rel:authors',
        categories: 'rel:categories[]',
        publishDate: 'datetime',
        featured: 'boolean',
        content: field.blocks({ allowed: ['hero'] }),
      },
      hooks: {
        beforeCreate: async ({ data }) => {
          if (!data.excerpt && data.body) {
            data.excerpt = data.body.substring(0, 200)
          }
          return data
        },
      },
      access: {
        read: true,
        create: (ctx) => !!ctx.user,
        update: (ctx) => ctx.user?.id === ctx.item?.authorId,
        delete: (ctx) => ctx.user?.role === 'admin',
      },
    },
  },
})
```
