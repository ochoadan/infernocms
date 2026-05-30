# Rich Text Field

Rich text field that stores formatted content as Plate.js JSON.

**Database Type:** `JSONB` (Plate.js JSON format)

**Options:**
- `required` - Makes the field mandatory
- `default` - Default value for new entries

**Shorthand:** `'richtext'`, `'richtext!'` (required)

## Features

The Plate.js content format represents:

- **Text Formatting** - Bold, italic, underline, strikethrough
- **Headings** - H1, H2, H3, H4, H5, H6
- **Links** - Hyperlinks with a URL
- **Lists** - Bulleted and numbered lists
- **Paragraphs** - Standard paragraph blocks

Content is stored as structured JSON (Plate.js format) rather than HTML.

## Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'posts',
  fields: {
    content: field.richtext({ required: true }),
    excerpt: field.richtext(),
  }
};
```

## Example: Shorthand

```js
export default {
  name: 'posts',
  fields: {
    content: 'richtext!',   // Required
    excerpt: 'richtext',    // Optional
  }
};
```

## Example: JSON Structure

Rich text is stored in Plate.js JSON format:

```json
{
  "content": [
    {
      "type": "h1",
      "children": [{ "text": "Welcome to InfernoCMS" }]
    },
    {
      "type": "p",
      "children": [
        { "text": "This is a " },
        { "text": "rich text", "bold": true },
        { "text": " editor." }
      ]
    },
    {
      "type": "ul",
      "children": [
        { "type": "li", "children": [{ "text": "Feature 1" }] },
        { "type": "li", "children": [{ "text": "Feature 2" }] }
      ]
    }
  ]
}
```

## Usage Notes

- Content is stored as JSONB in the database (not HTML or markdown)
- JSON format allows for structured parsing and rendering
- No shorthand configuration options (use `field.richtext()` for all cases)
- For plain text, use `textarea` instead
- For custom block structures, use the `blocks` field
