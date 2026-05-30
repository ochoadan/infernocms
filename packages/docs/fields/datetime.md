# Date & Time Fields

Date and time fields for storing temporal data.

## Datetime Field

Combined date and time picker, stored as `TIMESTAMP` in the database.

**Database Type:** `TIMESTAMP`

**Options:**
- `required` - Makes the field mandatory
- `default` - Default value for new entries

**Shorthand:** `'datetime'`, `'datetime!'` (required)

### Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'posts',
  fields: {
    publishedAt: field.datetime({ required: true }),
    updatedAt: field.datetime(),
  }
};
```

### Example: Shorthand

```js
export default {
  name: 'posts',
  fields: {
    publishedAt: 'datetime!',  // Required
    scheduledFor: 'datetime',  // Optional
  }
};
```

## Date Field

Date-only picker (no time component), stored as `DATE` in the database.

**Database Type:** `DATE`

**Options:**
- `required` - Makes the field mandatory
- `default` - Default value for new entries

**Shorthand:** `'date'`, `'date!'` (required)

### Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'events',
  fields: {
    eventDate: field.date({ required: true }),
    registrationDeadline: field.date(),
  }
};
```

### Example: Shorthand

```js
export default {
  name: 'events',
  fields: {
    eventDate: 'date!',      // Required
    deadline: 'date',        // Optional
  }
};
```

## Usage Notes

- `datetime` fields store both date and time with timezone support
- `date` fields store only the date (year, month, day)
- Values are stored in ISO 8601 format
- Use `datetime` for timestamps, `date` for calendar dates only
