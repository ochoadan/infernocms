# Select Field

Dropdown selection field with predefined options, stored as text and validated against the options list.

**Database Type:** `TEXT`

**Options:**
- `required` - Makes the field mandatory
- `default` - Default value for new entries (must be one of the options)
- `options` - Array of allowed string values (required)

**Shorthand:** None (requires `options` array, must use field helper)

## Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'posts',
  fields: {
    status: field.select({
      options: ['draft', 'published', 'archived'],
      default: 'draft',
      required: true,
    }),
    category: field.select({
      options: ['News', 'Blog', 'Press', 'Tutorial'],
    }),
  }
};
```

## Example: With Many Options

```js
export default {
  name: 'products',
  fields: {
    size: field.select({
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      required: true,
    }),
    color: field.select({
      options: ['Red', 'Blue', 'Green', 'Black', 'White'],
      default: 'Black',
    }),
  }
};
```

## Usage Notes

- The `options` parameter is required and must be an array of strings
- Selected value is stored as plain text in the database
- Values are validated on write: only options from the array are allowed
- No shorthand syntax available (must use `field.select()` helper)
- For dynamic relationships, use the `relation` field instead
