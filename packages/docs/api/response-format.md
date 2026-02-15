# Response Format

InfernoCMS follows consistent response formatting conventions across all API endpoints. All responses are returned as JSON.

## Success Responses

### Single Item Response

Endpoints that return a single item wrap the data in a `data` property.

```json
{
  "data": {
    "id": 1,
    "title": "Example Post",
    "slug": "example-post",
    "content": "This is the post content...",
    "status": "published",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Used by:**
- `GET /api/{collection}/:id`
- `POST /api/{collection}` (create)
- `PUT /api/{collection}/:id` (full update)
- `PATCH /api/{collection}/:id` (partial update)

**Standard Fields:**

All items include these system fields:
- `id` - Unique identifier
- `createdAt` - ISO 8601 timestamp of creation
- `updatedAt` - ISO 8601 timestamp of last update

### List Response

Endpoints that return multiple items include both `data` and `meta` properties.

```json
{
  "data": [
    {
      "id": 1,
      "title": "First Post",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "title": "Second Post",
      "createdAt": "2025-01-14T09:30:00.000Z",
      "updatedAt": "2025-01-14T09:30:00.000Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "perPage": 20,
    "totalPages": 5
  }
}
```

**Used by:**
- `GET /api/{collection}` (list)

**Meta Object:**
- `total` - Total number of items matching the query
- `page` - Current page number
- `perPage` - Number of items per page
- `totalPages` - Total number of pages available

### Empty List Response

When no items match the query, an empty array is returned.

```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "perPage": 20,
    "totalPages": 0
  }
}
```

### Delete Response

Delete operations return HTTP status `204 No Content` with an empty response body.

```
DELETE /api/posts/1
```

**Response:**
- Status: `204 No Content`
- Body: (empty)

### Upload Response

File upload endpoint returns file metadata.

```json
{
  "data": {
    "url": "/uploads/abc123def456.jpg",
    "filename": "abc123def456.jpg",
    "ext": ".jpg"
  }
}
```

### Schema Response

Schema introspection returns the complete schema structure.

```json
{
  "data": {
    "collections": [
      {
        "name": "posts",
        "label": "Posts",
        "fields": [
          {
            "name": "title",
            "type": "text",
            "required": true
          }
        ]
      }
    ]
  }
}
```

## Error Responses

### Error Format

All errors follow a consistent format with an `error` object.

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE"
  }
}
```

### Common Error Codes

#### VALIDATION_ERROR

Returned when request data fails validation.

```json
{
  "error": {
    "message": "Validation failed: title is required",
    "code": "VALIDATION_ERROR"
  }
}
```

**HTTP Status:** `400 Bad Request`

**Common causes:**
- Missing required fields
- Invalid field types
- Field value constraints not met
- Invalid foreign key references

#### NOT_FOUND

Returned when a requested resource does not exist.

```json
{
  "error": {
    "message": "Item not found",
    "code": "NOT_FOUND"
  }
}
```

**HTTP Status:** `404 Not Found`

**Common causes:**
- Invalid item ID
- Item has been deleted
- Collection does not exist

#### FORBIDDEN

Returned when the operation is not allowed.

```json
{
  "error": {
    "message": "You do not have permission to perform this action",
    "code": "FORBIDDEN"
  }
}
```

**HTTP Status:** `403 Forbidden`

**Common causes:**
- Insufficient permissions
- Authentication required
- Operation not allowed on this resource

### Other Error Codes

Additional error codes may include:
- `UNAUTHORIZED` - Authentication required (401)
- `CONFLICT` - Resource conflict, e.g., duplicate unique field (409)
- `INTERNAL_ERROR` - Unexpected server error (500)
- `BAD_REQUEST` - Malformed request (400)

## HTTP Status Codes

InfernoCMS uses standard HTTP status codes.

### Success Codes

| Code | Meaning | Used By |
|------|---------|---------|
| `200` | OK | GET (single/list), PUT, PATCH |
| `201` | Created | POST (create) |
| `204` | No Content | DELETE |

### Client Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `400` | Bad Request | Invalid request data or parameters |
| `401` | Unauthorized | Authentication required |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource does not exist |
| `409` | Conflict | Resource conflict (e.g., duplicate) |
| `422` | Unprocessable Entity | Validation errors |

### Server Error Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `500` | Internal Server Error | Unexpected server error |
| `503` | Service Unavailable | Server temporarily unavailable |

## Response Headers

### Content Type

All JSON responses include the appropriate content type header:

```
Content-Type: application/json; charset=utf-8
```

### Common Headers

Responses may include additional headers:

```
Content-Length: 1234
Date: Mon, 15 Jan 2025 10:00:00 GMT
Connection: keep-alive
```

## Examples

### Successful Create
```bash
curl -X POST http://localhost:4000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"My Post","content":"Hello world"}'
```

```json
{
  "data": {
    "id": 1,
    "title": "My Post",
    "content": "Hello world",
    "status": "draft",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Status:** `201 Created`

### Validation Error
```bash
curl -X POST http://localhost:4000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello world"}'
```

```json
{
  "error": {
    "message": "Validation failed: title is required",
    "code": "VALIDATION_ERROR"
  }
}
```

**Status:** `400 Bad Request`

### Not Found Error
```bash
curl http://localhost:4000/api/posts/99999
```

```json
{
  "error": {
    "message": "Item not found",
    "code": "NOT_FOUND"
  }
}
```

**Status:** `404 Not Found`

### Paginated List
```bash
curl "http://localhost:4000/api/posts?page=2&perPage=10"
```

```json
{
  "data": [
    {
      "id": 11,
      "title": "Post 11",
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 2,
    "perPage": 10,
    "totalPages": 5
  }
}
```

**Status:** `200 OK`

### Successful Delete
```bash
curl -X DELETE http://localhost:4000/api/posts/1
```

**Response:** (empty)

**Status:** `204 No Content`
