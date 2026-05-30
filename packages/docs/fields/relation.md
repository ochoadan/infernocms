# Relation Field

Relation fields create relationships between collections, supporting both single and many-to-many relationships.

**Database Type:**
- Single: `INTEGER` foreign key with `ON DELETE SET NULL`
- Many: Junction table (no column on main table)

**Options:**
- `collection` - Target collection name (required)
- `many` - Enable many-to-many relationship (default: false)

**Shorthand:** `'rel:collection'`, `'rel:collection[]'` (many)

## Single Relation

Links to one entry in another collection.

### Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'posts',
  fields: {
    author: field.relation({ collection: 'authors' }),
    category: field.relation({ collection: 'categories' }),
  }
};
```

### Example: Shorthand

```js
export default {
  name: 'posts',
  fields: {
    author: 'rel:authors',
    category: 'rel:categories',
  }
};
```

## Many-to-Many Relation

Links to multiple entries in another collection using a junction table.

### Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'posts',
  fields: {
    tags: field.relation({ collection: 'tags', many: true }),
    relatedPosts: field.relation({ collection: 'posts', many: true }),
  }
};
```

### Example: Shorthand

```js
export default {
  name: 'posts',
  fields: {
    tags: 'rel:tags[]',         // Many-to-many with tags
    coauthors: 'rel:authors[]', // Many-to-many with authors
  }
};
```

## Depth Parameter

Relations can be resolved in API responses using the `depth` query parameter:

```
GET /api/posts?depth=1
```

**Depth levels:**
- `depth=0` - Returns only IDs (default)
- `depth=1` - Resolves first-level relations
- `depth=2` - Resolves relations up to 2 levels deep

### Example Response

Without depth:
```json
{
  "id": 1,
  "title": "Hello World",
  "author": 5
}
```

With `depth=1`:
```json
{
  "id": 1,
  "title": "Hello World",
  "author": {
    "id": 5,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

## Usage Notes

- Single relations store an integer foreign key in the database
- Many-to-many relations use an automatically created junction table
- Foreign keys use `ON DELETE SET NULL` (deleting related entry sets field to null)
- Use `depth` parameter in API queries to include related data
- Self-referential relations are supported (e.g., `relatedPosts: 'rel:posts[]'`)
