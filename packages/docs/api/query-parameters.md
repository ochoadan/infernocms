# Query Parameters

InfernoCMS supports a variety of query parameters for controlling pagination, sorting, and relation depth on list endpoints.

## Pagination

### Page-Based Pagination

Use `page` and `perPage` parameters for page-based pagination.

```
GET /api/posts?page=2&perPage=20
```

**Parameters:**
- `page` (default: `1`) - The page number to retrieve
- `perPage` (default: `20`, max: `100`) - Number of items per page

**Example:**
```bash
# Get page 3 with 50 items per page
curl "http://localhost:4000/api/posts?page=3&perPage=50"
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 250,
    "page": 3,
    "perPage": 50,
    "totalPages": 5
  }
}
```

### Offset-Based Pagination

Alternatively, use `limit` and `offset` for offset-based pagination.

```
GET /api/posts?limit=20&offset=40
```

**Parameters:**
- `limit` (default: `20`, max: `100`) - Maximum number of items to return
- `offset` (default: `0`) - Number of items to skip

**Example:**
```bash
# Skip first 100 items, get next 25
curl "http://localhost:4000/api/posts?offset=100&limit=25"
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 250,
    "page": 5,
    "perPage": 25,
    "totalPages": 10
  }
}
```

## Sorting

### Sort Parameter

Sort results by any field using the `sort` parameter.

```
GET /api/posts?sort=title
```

**Ascending Order:**
```bash
# Sort by title A-Z
curl "http://localhost:4000/api/posts?sort=title"
```

**Descending Order:**

Prefix the field name with `-` for descending order.

```bash
# Sort by creation date, newest first
curl "http://localhost:4000/api/posts?sort=-createdAt"

# Sort by price, highest first
curl "http://localhost:4000/api/products?sort=-price"
```

**Default Sort:**

If no `sort` parameter is provided, results are sorted by `-createdAt` (newest first).

**Multiple Sort Fields:**

Some implementations support comma-separated fields:
```bash
# Sort by status, then by date descending
curl "http://localhost:4000/api/posts?sort=status,-createdAt"
```

## Relation Depth

### Depth Parameter

Control how deeply related items are resolved using the `depth` parameter.

```
GET /api/posts?depth=1
```

**Depth Levels:**
- `depth=0` - Relations return only IDs (default behavior)
- `depth=1` - Resolve relations one level deep
- `depth=2` - Resolve relations two levels deep (maximum)

**Examples:**

**Depth 0 (IDs only):**
```bash
curl "http://localhost:4000/api/posts?depth=0"
```
```json
{
  "data": {
    "id": 1,
    "title": "My Post",
    "author": 5,
    "categories": [1, 3, 7]
  }
}
```

**Depth 1 (One level):**
```bash
curl "http://localhost:4000/api/posts?depth=1"
```
```json
{
  "data": {
    "id": 1,
    "title": "My Post",
    "author": {
      "id": 5,
      "name": "John Doe",
      "organization": 2
    },
    "categories": [
      { "id": 1, "name": "Tech" },
      { "id": 3, "name": "News" }
    ]
  }
}
```

**Depth 2 (Two levels):**
```bash
curl "http://localhost:4000/api/posts?depth=2"
```
```json
{
  "data": {
    "id": 1,
    "title": "My Post",
    "author": {
      "id": 5,
      "name": "John Doe",
      "organization": {
        "id": 2,
        "name": "Acme Corp"
      }
    }
  }
}
```

## Combining Parameters

All query parameters can be combined in a single request.

**Examples:**

```bash
# Page 2, 50 items, sorted by title, with relations resolved
curl "http://localhost:4000/api/posts?page=2&perPage=50&sort=title&depth=1"

# Custom pagination with sorting
curl "http://localhost:4000/api/posts?offset=20&limit=10&sort=-publishedAt"

# Get latest 5 posts with full relations
curl "http://localhost:4000/api/posts?perPage=5&sort=-createdAt&depth=2"
```

## Parameter Validation

**Maximum Values:**
- `perPage` and `limit` are capped at `100` items
- `depth` is capped at `2` levels

Exceeding these limits will result in the maximum value being used instead.

**Invalid Values:**

Invalid parameter values will be ignored and defaults will be used:
```bash
# page=-1 is invalid, will use page=1
curl "http://localhost:4000/api/posts?page=-1"

# depth=5 exceeds max, will use depth=2
curl "http://localhost:4000/api/posts?depth=5"
```
