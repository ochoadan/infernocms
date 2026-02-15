# Filtering

InfernoCMS provides powerful operator-based filtering for querying collections. Filters can be combined to create complex queries.

## Basic Filtering

### Exact Match

Filter by exact field value.

```
GET /api/posts?status=published
```

**Examples:**
```bash
# Get all published posts
curl "http://localhost:4000/api/posts?status=published"

# Get posts by specific author ID
curl "http://localhost:4000/api/posts?author=5"

# Get active products
curl "http://localhost:4000/api/products?active=true"
```

## Comparison Operators

### Not Equal

Use `_ne` suffix to exclude a value.

```
GET /api/posts?status_ne=draft
```

**Examples:**
```bash
# Get all non-draft posts
curl "http://localhost:4000/api/posts?status_ne=draft"

# Get posts not by author #5
curl "http://localhost:4000/api/posts?author_ne=5"
```

### Greater Than

Use `_gt` suffix for values greater than the specified value.

```
GET /api/products?price_gt=100
```

**Examples:**
```bash
# Products priced over $100
curl "http://localhost:4000/api/products?price_gt=100"

# Posts with more than 10 views
curl "http://localhost:4000/api/posts?views_gt=10"
```

### Greater Than or Equal

Use `_gte` suffix for values greater than or equal to the specified value.

```
GET /api/products?price_gte=100
```

**Examples:**
```bash
# Products priced $100 or more
curl "http://localhost:4000/api/products?price_gte=100"

# Posts created on or after Jan 1, 2025
curl "http://localhost:4000/api/posts?createdAt_gte=2025-01-01"
```

### Less Than

Use `_lt` suffix for values less than the specified value.

```
GET /api/products?price_lt=200
```

**Examples:**
```bash
# Products under $200
curl "http://localhost:4000/api/products?price_lt=200"

# Posts with fewer than 100 views
curl "http://localhost:4000/api/posts?views_lt=100"
```

### Less Than or Equal

Use `_lte` suffix for values less than or equal to the specified value.

```
GET /api/products?price_lte=200
```

**Examples:**
```bash
# Products $200 or less
curl "http://localhost:4000/api/products?price_lte=200"

# Posts created before end of 2024
curl "http://localhost:4000/api/posts?createdAt_lte=2024-12-31"
```

## String Operators

### Contains

Use `_contains` suffix for case-insensitive substring matching (uses SQL ILIKE).

```
GET /api/posts?title_contains=hello
```

**Examples:**
```bash
# Posts with "guide" in the title
curl "http://localhost:4000/api/posts?title_contains=guide"

# Products containing "phone" in description
curl "http://localhost:4000/api/products?description_contains=phone"
```

### Starts With

Use `_startsWith` suffix for case-insensitive prefix matching.

```
GET /api/posts?title_startsWith=Hello
```

**Examples:**
```bash
# Posts with titles starting with "How to"
curl "http://localhost:4000/api/posts?title_startsWith=How%20to"

# Categories starting with "Tech"
curl "http://localhost:4000/api/categories?name_startsWith=Tech"
```

### Ends With

Use `_endsWith` suffix for case-insensitive suffix matching.

```
GET /api/posts?title_endsWith=world
```

**Examples:**
```bash
# Posts ending with "Tutorial"
curl "http://localhost:4000/api/posts?title_endsWith=Tutorial"

# Files ending with specific extension pattern
curl "http://localhost:4000/api/files?filename_endsWith=.pdf"
```

## List Operators

### In List

Use `_in` suffix to match any value in a comma-separated list.

```
GET /api/posts?status_in=draft,published
```

**Examples:**
```bash
# Posts that are either draft or published
curl "http://localhost:4000/api/posts?status_in=draft,published"

# Multiple category IDs
curl "http://localhost:4000/api/posts?category_in=1,3,5,7"

# Products in specific price tiers
curl "http://localhost:4000/api/products?tier_in=premium,enterprise"
```

## Full-Text Search

### Search Parameter

Use `search` parameter to perform full-text search across all text and textarea fields.

```
GET /api/posts?search=hello
```

**Examples:**
```bash
# Search for "javascript" in all text fields
curl "http://localhost:4000/api/posts?search=javascript"

# Search products for "wireless"
curl "http://localhost:4000/api/products?search=wireless"
```

**Note:** The search parameter queries across all text and textarea type fields in the collection, making it ideal for general keyword searches.

## Field Selection

### Fields Parameter

Use `fields` parameter to return only specific columns. The `id` field is always included.

```
GET /api/posts?fields=id,title,slug
```

**Examples:**
```bash
# Only return id, title, and slug
curl "http://localhost:4000/api/posts?fields=id,title,slug"

# Minimal product data
curl "http://localhost:4000/api/products?fields=id,name,price"

# Combine with filters
curl "http://localhost:4000/api/posts?status=published&fields=title,publishedAt"
```

**Benefits:**
- Reduces response payload size
- Improves query performance
- Ideal for dropdown lists or autocomplete

## Combining Filters

All filtering operators can be combined in a single query.

**Examples:**

```bash
# Published posts with "guide" in title, sorted by date
curl "http://localhost:4000/api/posts?title_contains=guide&status=published&sort=-createdAt"

# Products priced between $100-$500
curl "http://localhost:4000/api/products?price_gte=100&price_lte=500"

# Recent posts by specific author
curl "http://localhost:4000/api/posts?author=5&createdAt_gte=2025-01-01&sort=-createdAt"

# Complex search with pagination
curl "http://localhost:4000/api/posts?search=tutorial&status_in=published,featured&page=1&perPage=20"

# Filtered list with specific fields
curl "http://localhost:4000/api/products?category=electronics&price_lt=1000&fields=id,name,price,image"
```

## Filter Examples by Use Case

### Blog Posts
```bash
# Published posts from last month
curl "http://localhost:4000/api/posts?status=published&createdAt_gte=2025-01-01&createdAt_lt=2025-02-01"

# Featured posts containing "tutorial"
curl "http://localhost:4000/api/posts?featured=true&title_contains=tutorial"
```

### E-commerce Products
```bash
# In-stock products under $100
curl "http://localhost:4000/api/products?inStock=true&price_lt=100"

# Products in specific categories with search
curl "http://localhost:4000/api/products?category_in=1,2,3&search=wireless"
```

### User Management
```bash
# Active users registered this year
curl "http://localhost:4000/api/users?active=true&createdAt_gte=2025-01-01"

# Users with specific roles
curl "http://localhost:4000/api/users?role_in=admin,editor"
```

## Query String Encoding

Remember to properly encode special characters in URLs:

```bash
# Space encoded as %20
curl "http://localhost:4000/api/posts?title_contains=hello%20world"

# Special characters
curl "http://localhost:4000/api/posts?title_contains=Node.js%20%26%20Express"
```
