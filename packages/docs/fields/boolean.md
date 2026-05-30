# Boolean Field

Boolean field for storing true/false values.

**Database Type:** `BOOLEAN`

**Options:**
- `required` - Makes the field mandatory (must be explicitly true or false)
- `default` - Default value for new entries (true or false)

**Shorthand:** `'boolean'`, `'boolean!'` (required)

## Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'posts',
  fields: {
    published: field.boolean({ default: false }),
    featured: field.boolean({ required: true }),
  }
};
```

## Example: Shorthand

```js
export default {
  name: 'posts',
  fields: {
    published: 'boolean',   // Optional, defaults to null
    featured: 'boolean!',   // Required (must be true or false)
  }
};
```

## Example: With Defaults

```js
export default {
  name: 'articles',
  fields: {
    draft: field.boolean({ default: true }),
    featured: field.boolean({ default: false }),
    archived: field.boolean({ default: false }),
  }
};
```

## Usage Notes

- Without a default value, the field will be `null` (unless `required: true`)
- Setting `required: true` forces users to explicitly choose true or false
- Common use cases: published status, feature flags, visibility toggles
