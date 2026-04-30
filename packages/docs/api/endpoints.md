# API Endpoints

InfernoCMS provides a comprehensive REST API built on Fastify. All endpoints follow RESTful conventions and return JSON responses.

## Core Endpoints

### Schema Introspection

#### Get Schema
```
GET /api/_schema
```

Returns the parsed schema for all collections and shared blocks. Unlike CRUD endpoints, this endpoint does **not** wrap its response in a `data` envelope — it returns the schema object directly.

**Response shape:**
```json
{
  "blocks": {
    "hero": {
      "name": "hero",
      "fields": {
        "heading": { "type": "text", "required": true, "silent": false },
        "subheading": { "type": "text", "required": false, "silent": false }
      }
    }
  },
  "collections": {
    "posts": {
      "name": "posts",
      "fields": {
        "title": { "type": "text", "required": true, "silent": false },
        "slug": { "type": "slug", "from": "title", "required": false, "silent": false },
        "author": { "type": "relation", "collection": "authors", "required": false, "silent": false }
      }
    }
  }
}
```

`collections` and `blocks` are objects keyed by name (not arrays). Each field's shape mirrors the parsed `NormalizedFieldConfig` and includes type-specific options (`maxLength`, `options`, `collection`, `many`, `from`, `allowed`, nested `fields`, etc.).

#### Health Check
```
GET /api/_health
```

Returns `{ "status": "ok" }` when the server is running.

### File Upload

#### Upload File
```
POST /api/_upload
```

Handles multipart file uploads and returns file metadata.

**Request:**
- Content-Type: `multipart/form-data`
- Body: File field in form data

**Response:**
```json
{
  "data": {
    "url": "/uploads/abc123.jpg",
    "filename": "abc123.jpg",
    "ext": ".jpg"
  }
}
```

## Collection Endpoints

All collections automatically receive the following CRUD endpoints:

### List Items
```
GET /api/{collection}
```

Retrieve a paginated list of items from a collection. Supports filtering, sorting, and query parameters.

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "perPage": 20,
    "totalPages": 5
  }
}
```

### Get Single Item
```
GET /api/{collection}/:id
```

Retrieve a single item by its ID.

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Example",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z",
    ...
  }
}
```

### Create Item
```
POST /api/{collection}
```

Create a new item in the collection.

**Request:**
```json
{
  "title": "New Post",
  "content": "Post content...",
  ...
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "New Post",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z",
    ...
  }
}
```

### Full Update
```
PUT /api/{collection}/:id
```

Replace an entire item with new data. All fields must be provided.

**Request:**
```json
{
  "title": "Updated Post",
  "content": "Updated content...",
  ...
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Updated Post",
    "updatedAt": "2025-01-15T11:00:00.000Z",
    ...
  }
}
```

### Partial Update
```
PATCH /api/{collection}/:id
```

Update specific fields of an item. Only provided fields will be modified.

**Request:**
```json
{
  "title": "Partially Updated Post"
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Partially Updated Post",
    "updatedAt": "2025-01-15T11:30:00.000Z",
    ...
  }
}
```

### Delete Item
```
DELETE /api/{collection}/:id
```

Delete an item from the collection.

**Response:**
- Status: `204 No Content`
- Empty body

## Examples

### Complete CRUD Flow
```bash
# List all posts
curl http://localhost:4000/api/posts

# Get post #1
curl http://localhost:4000/api/posts/1

# Create a new post
curl -X POST http://localhost:4000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"My Post","content":"Hello world"}'

# Update post #1
curl -X PATCH http://localhost:4000/api/posts/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title"}'

# Delete post #1
curl -X DELETE http://localhost:4000/api/posts/1
```

