# Image & File Fields

Image and file fields store URLs to uploaded assets. Use with the built-in file upload endpoint.

**Database Type:** `TEXT` (stores URL string)

**Options:**
- `required` - Makes the field mandatory
- `default` - Default URL value for new entries

**Shorthand:** `'image'`, `'file'`, `'image!'`, `'file!'` (required)

## Image Field

Stores image URLs, typically used with image upload functionality.

### Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'posts',
  fields: {
    coverImage: field.image({ required: true }),
    thumbnail: field.image(),
  }
};
```

### Example: Shorthand

```js
export default {
  name: 'posts',
  fields: {
    coverImage: 'image!',   // Required
    thumbnail: 'image',     // Optional
  }
};
```

## File Field

Stores file URLs for any file type (PDFs, documents, archives, etc.).

### Example: Field Helper

```js
import { field } from 'infernocms';

export default {
  name: 'resources',
  fields: {
    document: field.file({ required: true }),
    attachment: field.file(),
  }
};
```

### Example: Shorthand

```js
export default {
  name: 'resources',
  fields: {
    document: 'file!',   // Required
    attachment: 'file',  // Optional
  }
};
```

## Upload Workflow

InfernoCMS provides a built-in upload endpoint for handling file and image uploads.

### Step 1: Upload File

```bash
POST /api/_upload
Content-Type: multipart/form-data

file: <binary data>
```

### Step 2: Receive URL

```json
{
  "url": "/uploads/abc123-image.jpg"
}
```

### Step 3: Save URL to Field

```bash
POST /api/posts
Content-Type: application/json

{
  "title": "My Post",
  "coverImage": "/uploads/abc123-image.jpg"
}
```

## Example: Complete Upload Flow

```js
// Client-side upload example
async function uploadAndCreatePost(file, postData) {
  // Step 1: Upload the file
  const formData = new FormData();
  formData.append('file', file);

  const uploadRes = await fetch('/api/_upload', {
    method: 'POST',
    body: formData,
  });
  const { url } = await uploadRes.json();

  // Step 2: Create post with image URL
  const postRes = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...postData,
      coverImage: url,
    }),
  });

  return postRes.json();
}
```

## Usage Notes

- Both `image` and `file` fields store plain text URLs (no binary data)
- The database does not differentiate between image and file fields (both use `TEXT`)
- The difference is in the admin UI (image preview vs file link)
- Use the `/api/_upload` endpoint to handle file uploads
- Store the returned URL in the image/file field
- File validation and storage is handled by the upload endpoint
- Supports any file storage backend (local filesystem, S3, CDN, etc.)
