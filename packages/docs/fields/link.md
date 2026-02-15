# Link Field

Structured link field storing a URL with optional label and target.

**Database Type:** `JSONB`

**Options:**
- `required` - Makes the field mandatory

**Shorthand:** `'link'`

## How It Works

The link field stores a JSON object with:
- `url` (string, required) - The link URL
- `label` (string, optional) - Display text for the link
- `target` (string, optional) - Either `'_self'` or `'_blank'`

## Example: Field Helper

```typescript
import { field } from 'infernocms';

export default defineConfig({
  collections: {
    pages: {
      fields: {
        cta: field.link(),
        externalLink: field.link({ required: true }),
      }
    }
  }
});
```

## Example: Shorthand

```typescript
fields: {
  website: 'link',
}
```

## Example: Data Structure

```json
{
  "cta": {
    "url": "https://example.com/signup",
    "label": "Sign Up Now",
    "target": "_blank"
  }
}
```

## Validation

The API validates link values:
- `url` must be a string
- `label` must be a string (if provided)
- `target` must be `'_self'` or `'_blank'` (if provided)

## Admin UI

The admin renders three inputs:
- **URL** - Text input for the link URL
- **Label** - Optional text input for display text
- **Target** - Dropdown to choose same window or new window

## TypeScript Type

Generated type:

```typescript
{ url: string; label?: string; target?: '_self' | '_blank' }
```
