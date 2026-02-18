# Field Types Overview

InfernoCMS provides 18 built-in field types to handle various data structures. Fields can be defined using `field.xxx()` helpers or shorthand string notation.

## All Field Types

| Type | DB Type | Shorthand | Description |
|------|---------|-----------|-------------|
| text | TEXT | `'text'` | Single line text input |
| textarea | TEXT | `'textarea'` | Multi-line text input |
| richtext | JSONB | `'richtext'` | Plate.js rich text editor (stored as JSON) |
| number | REAL/INTEGER | `'number'` | Numeric value (float or integer) |
| boolean | BOOLEAN | `'boolean'` | True/false checkbox |
| select | TEXT | N/A | Dropdown selection from predefined options |
| datetime | TIMESTAMP | `'datetime'` | Date and time picker |
| date | DATE | `'date'` | Date only picker |
| json | JSONB | `'json'` | Arbitrary JSON data |
| relation | INTEGER | `'rel:collection'` | Foreign key to another collection |
| slug | TEXT (UNIQUE) | `'slug:field'` | URL-friendly slug, auto-generated |
| image | TEXT | `'image'` | Image URL (use with upload endpoint) |
| file | TEXT | `'file'` | File URL (use with upload endpoint) |
| blocks | JSONB | N/A | Array of typed content blocks |
| link | JSONB | `'link'` | Structured link (URL, label, target) |
| group | JSONB | N/A | Composite sub-fields stored as single object |
| array | JSONB | N/A | Repeatable list of sub-field objects |

## Common Options

All field types support these common options:

- **`required`** - Makes the field mandatory (cannot be null)
- **`default`** - Sets a default value when creating new entries

## Shorthand Syntax

Most fields support shorthand string notation for quick definition:

```js
{
  title: 'text',           // Basic text field
  description: 'textarea', // Multi-line text
  count: 'number',         // Numeric field
  published: 'boolean',    // Boolean field
  website: 'link',         // Link field
}
```

### Required Fields

Add a `!` suffix to mark fields as required:

```js
{
  title: 'text!',          // Required text field
  slug: 'slug:title!',     // Required slug field
}
```

## Field Helper Syntax

For more control, use the `field` helper:

```js
import { field } from 'infernocms';

{
  title: field.text({ required: true, default: 'Untitled' }),
  category: field.select({ options: ['News', 'Blog', 'Press'] }),
  cta: field.link(),
  seo: field.group({
    fields: {
      title: field.text(),
      description: field.textarea(),
    }
  }),
  features: field.array({
    fields: {
      title: field.text({ required: true }),
      icon: field.image(),
    }
  }),
}
```

## Next Steps

- Learn about specific field types in the individual field documentation
- See examples of field definitions in collection schemas
- Understand how fields map to database columns
