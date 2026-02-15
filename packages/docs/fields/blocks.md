# Blocks Field

Flexible content field storing an array of typed blocks. Block types are defined at the top level of your config with typed schemas.

**Database Type:** `JSONB` (array of typed block objects)

**Options:**
- `required` - Makes the field mandatory
- `allowed` - Array of allowed block type names (references top-level block schemas)

**Shorthand:** None (must use field helper)

## Defining Block Schemas

Block schemas are defined at the top level of your config, shared across all collections:

```typescript
import { defineConfig, field } from 'infernocms';

export default defineConfig({
  blocks: {
    hero: {
      fields: {
        heading: field.text({ required: true }),
        subheading: field.text(),
        image: field.image(),
        cta: field.link(),
      }
    },
    richtext: {
      fields: {
        content: field.richtext(),
      }
    },
    features: {
      fields: {
        items: field.array({
          fields: {
            icon: field.image(),
            title: field.text({ required: true }),
          }
        }),
      }
    },
  },
  collections: {
    pages: {
      fields: {
        title: field.text({ required: true }),
        content: field.blocks({
          allowed: ['hero', 'richtext', 'features'],
        }),
      }
    }
  }
});
```

## Using Blocks in Collections

Reference block schemas by name in the `allowed` array:

```typescript
fields: {
  content: field.blocks({
    allowed: ['hero', 'richtext', 'features'],
  }),
}
```

If `allowed` is omitted, all defined block types are available.

## Data Structure

Each block in the array has a `type` and `id` property plus fields matching its schema:

```json
{
  "content": [
    {
      "type": "hero",
      "id": "block_abc123",
      "heading": "Welcome",
      "subheading": "Build amazing things",
      "image": "/uploads/hero.jpg",
      "cta": { "url": "/signup", "label": "Get Started", "target": "_self" }
    },
    {
      "type": "richtext",
      "id": "block_def456",
      "content": [{ "type": "p", "children": [{ "text": "Hello world" }] }]
    }
  ]
}
```

## Validation

The API validates blocks against their schemas:
- Each block must have a `type` string
- If `allowed` is set, only those types are accepted
- If a block schema exists for the type, sub-fields are validated against it
- Required sub-fields in block schemas are enforced

## Admin UI

The admin renders blocks using a schema-driven editor:
- **Block picker**: Shows available block types from schemas filtered by `allowed`
- **Block rendering**: Each block's fields are rendered using the standard field renderers
- **Reorder/remove**: Blocks can be reordered or removed
- **Unknown types**: Blocks with types not in any schema show a fallback editor

## Type Generation

When block schemas are defined, `infernocms generate types` produces typed interfaces:

```typescript
export interface HeroBlock {
  type: 'hero';
  id: string;
  heading: string;
  subheading?: string;
  image?: string;
  cta?: { url: string; label?: string; target?: '_self' | '_blank' };
}

export interface RichtextBlock {
  type: 'richtext';
  id: string;
  content?: unknown;
}

export type ContentBlock = HeroBlock | RichtextBlock | FeaturesBlock;
```

## Usage Notes

- Block schemas live at the **top level** of your config (shared across collections)
- Block fields can use any field type including `link`, `group`, and `array`
- The `allowed` option on a blocks field restricts which block types are available
- Frontend code must handle rendering each block type appropriately
