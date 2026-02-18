# Array Field

Repeatable field that stores an array of objects, each containing the same set of sub-fields.

**Database Type:** `JSONB`

**Options:**
- `required` - Makes the field mandatory
- `fields` - Record of sub-field definitions for each item (required)

**Shorthand:** None (must use field helper)

## How It Works

The array field stores a JSON array where each item is an object with the same sub-field structure. Sub-fields support scalar types: text, number, boolean, select, datetime, date, image, file, richtext, and link.

## Example: Field Helper

```typescript
import { field } from 'infernocms';

export default defineConfig({
  collections: {
    pages: {
      fields: {
        features: field.array({
          fields: {
            icon: field.image(),
            title: field.text({ required: true }),
            description: field.textarea(),
          }
        }),
      }
    }
  }
});
```

## Example: Data Structure

```json
{
  "features": [
    {
      "icon": "/uploads/icon-fast.svg",
      "title": "Lightning Fast",
      "description": "Built for speed"
    },
    {
      "icon": "/uploads/icon-secure.svg",
      "title": "Secure",
      "description": "Bank-level security"
    }
  ]
}
```

## Validation

The API validates array values:
- The value must be an array
- Each item must be an object
- Each item's sub-fields are validated according to their type
- Required sub-fields are enforced per item

## Admin UI

The admin renders each array item inside a bordered container with:
- Sub-field renderers for each field
- Add, remove, and reorder buttons
- Item numbering

## TypeScript Type

Generated as an array of inline object type:

```typescript
{ icon?: string; title: string; description?: string }[]
```
