# Text & Textarea Fields

Text fields are the most basic field types for storing string content.

## Text Field

Single-line text input, stored as `TEXT` in the database.

**Database Type:** `TEXT`

**Options:**
- `required` - Makes the field mandatory
- `default` - Default value for new entries

**Shorthand:** `'text'`, `'text!'` (required)

### Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'posts',
  fields: {
    title: field.text({ required: true }),
    subtitle: field.text({ default: '' }),
  }
};
```

### Example: Shorthand

```js
export default {
  name: 'posts',
  fields: {
    title: 'text!',        // Required
    subtitle: 'text',      // Optional
  }
};
```

## Textarea Field

Multi-line text input with a larger textarea UI, stored as `TEXT` in the database.

**Database Type:** `TEXT`

**Options:**
- `required` - Makes the field mandatory
- `default` - Default value for new entries

**Shorthand:** `'textarea'`, `'textarea!'` (required)

### Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'posts',
  fields: {
    content: field.textarea({ required: true }),
    excerpt: field.textarea(),
  }
};
```

### Example: Shorthand

```js
export default {
  name: 'posts',
  fields: {
    content: 'textarea!',   // Required
    excerpt: 'textarea',    // Optional
  }
};
```

## Usage Notes

- Both `text` and `textarea` are stored identically in the database as `TEXT`
- The difference is only in the admin UI (single-line vs multi-line input)
- For rich text editing with formatting, use the `richtext` field instead
- Text fields have no maximum length by default (database-dependent)
