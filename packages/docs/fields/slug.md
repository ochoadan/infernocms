# Slug Field

URL-friendly slug field that auto-generates from another field and ensures uniqueness.

**Database Type:** `TEXT` with `UNIQUE` constraint

**Options:**
- `from` - Source field name to generate slug from (required)
- `required` - Makes the field mandatory
- `default` - Default value for new entries

**Shorthand:** `'slug:fieldname'`, `'slug:fieldname!'` (required)

## How It Works

1. Auto-generates URL-friendly slug from the specified `from` field
2. Converts to lowercase, replaces spaces with hyphens, removes special characters
3. Automatically deduplicates by appending `-2`, `-3`, etc. if slug exists
4. Can be manually overridden (value will be slugified)

## Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'posts',
  fields: {
    title: 'text!',
    slug: field.slug({ from: 'title', required: true }),
  }
};
```

## Example: Shorthand

```js
export default {
  name: 'posts',
  fields: {
    title: 'text!',
    slug: 'slug:title!',   // Auto-generates from title
  }
};
```

## Example: Auto-Deduplication

If you create posts with the same title:

```
"Hello World" → slug: "hello-world"
"Hello World" → slug: "hello-world-2"
"Hello World" → slug: "hello-world-3"
```

## Example: Manual Override

You can manually set the slug value:

```js
// Creating a post
{
  title: "My Awesome Post",
  slug: "custom-url-slug"  // Will be stored as "custom-url-slug"
}

// Special characters are auto-slugified
{
  title: "My Post",
  slug: "My Custom Slug!"  // Becomes "my-custom-slug"
}
```

## Usage Notes

- Slugs are automatically generated on creation from the `from` field
- The `UNIQUE` constraint ensures no duplicate slugs in the collection
- Deduplication happens automatically (appends `-2`, `-3`, etc.)
- Manual slugs are allowed but will be slugified (lowercased, hyphenated)
- Perfect for creating SEO-friendly URLs: `/posts/:slug`
- Slug generation happens server-side on write operations
