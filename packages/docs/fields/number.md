# Number Field

Numeric field for storing integer or floating-point numbers.

**Database Type:** `REAL` (float) by default, `INTEGER` with `integer: true`

**Options:**
- `required` - Makes the field mandatory
- `default` - Default value for new entries
- `integer` - Store as INTEGER instead of REAL (whole numbers only)

**Shorthand:** `'number'`, `'number!'` (required)

## Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'products',
  fields: {
    price: field.number({ required: true }),
    rating: field.number({ default: 0 }),
    stock: field.number({ integer: true, default: 0 }),
  }
};
```

## Example: Shorthand

```js
export default {
  name: 'products',
  fields: {
    price: 'number!',      // Required, stored as REAL
    rating: 'number',      // Optional, stored as REAL
  }
};
```

## Example: Integer Values

```js
export default {
  name: 'articles',
  fields: {
    views: field.number({ integer: true, default: 0 }),
    likes: field.number({ integer: true }),
  }
};
```

## Usage Notes

- By default, numbers are stored as `REAL` (floating-point)
- Use `integer: true` for whole numbers only (no decimals)
- The shorthand `'number'` always uses `REAL` type
- For integer fields, you must use the field helper: `field.number({ integer: true })`
- Numeric validations are handled automatically by the database
