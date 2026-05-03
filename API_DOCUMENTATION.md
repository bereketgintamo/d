# API Documentation - Chat File Upload System

## Base URL
```
http://your-server-url:3000
```

## Authentication
All endpoints (except health check) require Firebase Authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

---

## Endpoints

### 1. Upload File

**POST** `/upload`

Uploads a file (image or document) to Supabase Storage.

**Headers:**
- `Authorization: Bearer <firebase_id_token>`
- `Content-Type: multipart/form-data`

**Request Body (multipart/form-data):**
| Field | Type | Description |
|-------|------|-------------|
| file | binary | The file to upload |

**Success Response (200 OK):**
```json
{
  "message": "Upload successful",
  "file_url": "https://your-project.supabase.co/storage/v1/object/public/uploads/uid/1234567890_image.jpg",
  "url": "https://your-project.supabase.co/storage/v1/object/public/uploads/uid/1234567890_image.jpg"
}
```

**Error Responses:**

| Status Code | Response | Description |
|-------------|----------|-------------|
| 400 | `{"error": "No file uploaded"}` | No file provided |
| 401 | `{"error": "Unauthorized"}` | Missing or invalid token |
| 500 | `{"error": "error message"}` | Server error |

---

### 2. Get User Files

**GET** `/files`

Retrieves all files uploaded by the authenticated user.

**Headers:**
- `Authorization: Bearer <firebase_id_token>`

**Success Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "firebase_uid_12345",
    "file_url": "https://your-project.supabase.co/storage/v1/object/public/uploads/uid/1234567890_image.jpg",
    "file_name": "image.jpg",
    "file_type": "image/jpeg",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "firebase_uid_12345",
    "file_url": "https://your-project.supabase.co/storage/v1/object/public/uploads/uid/1234567891_document.pdf",
    "file_name": "document.pdf",
    "file_type": "application/pdf",
    "created_at": "2024-01-14T09:15:00.000Z"
  }
]
```

**Error Responses:**

| Status Code | Response | Description |
|-------------|----------|-------------|
| 401 | `{"error": "Unauthorized"}` | Missing or invalid token |
| 500 | `{"error": "error message"}` | Server error |

---

### 3. Update Profile Image

**PUT** `/user/profile-image`

Updates the user's profile image URL.

**Headers:**
- `Authorization: Bearer <firebase_id_token>`
- `Content-Type: application/json`

**Request Body (JSON):**
```json
{
  "profile_image_url": "https://your-project.supabase.co/storage/v1/object/public/uploads/uid/1234567890_avatar.jpg"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Profile updated"
}
```

**Error Responses:**

| Status Code | Response | Description |
|-------------|----------|-------------|
| 400 | `{"error": "Image URL required"}` | Missing profile_image_url |
| 401 | `{"error": "Unauthorized"}` | Missing or invalid token |
| 500 | `{"error": "error message"}` | Server error |

---

## Usage Examples

### cURL Examples

**Upload a file:**
```bash
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**Get user files:**
```bash
curl -X GET http://localhost:3000/files \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

**Update profile image:**
```bash
curl -X PUT http://localhost:3000/user/profile-image \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profile_image_url": "https://example.com/image.jpg"}'
```

---

## Notes

1. **File Storage Path**: Files are stored in Supabase Storage under `uploads/{uid}/{timestamp}_{filename}`
2. **Public Access**: The `uploads` bucket must be public for URLs to work
3. **Token Expiry**: Firebase ID tokens expire after 1 hour. Request a fresh token for each API call
4. **File Types**: All file types are accepted. The server stores the MIME type in the database