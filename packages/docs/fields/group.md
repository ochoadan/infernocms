# Group Field

Composite field that groups multiple sub-fields into a single JSON object.

**Database Type:** `JSONB`

**Options:**
- `required` - Makes the field mandatory
- `fields` - Record of sub-field definitions (required)

**Shorthand:** None (must use field helper)

## How It Works

The group field stores a JSON object where each key corresponds to a sub-field. Sub-fields support scalar types: text, number, boolean, select, datetime, date, image, file, richtext, and link.

## Example: Field Helper

```typescript
import { field } from 'infernocms';

export default defineConfig({
  collections: {
    pages: {
      fields: {
        seo: field.group({
          fields: {
            title: field.text({ required: true }),
            description: field.textarea(),
            ogImage: field.image(),
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
  "seo": {
    "title": "My Page Title",
    "description": "A description for search engines",
    "ogImage": "/uploads/og-image.jpg"
  }
}
```

## Validation

The API validates group values:
- The value must be an object
- Each sub-field is validated according to its type
- Required sub-fields are enforced

## Admin UI

The admin renders sub-fields inside a bordered container, using the same field renderers as top-level fields.

## TypeScript Type

Generated as an inline object type:

```typescript
{ title: string; description?: string; ogImage?: string }
```
