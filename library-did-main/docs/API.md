# API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most admin endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Endpoints

### Authentication

#### Login

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "changeme123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

### Books

#### Search Books

```http
GET /api/books?query={search}&genre={genre}&limit={limit}
```

**Query Parameters:**
- `query` (optional): Search term for title or author
- `genre` (optional): Filter by genre
- `limit` (optional): Maximum results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "bookId": "ISBN-001",
      "title": "별을 헤아리는 아이",
      "author": "김동화",
      "summary": "밤하늘의 별을 세며 꿈을 키워가는 소년의 이야기입니다...",
      "genre": "과학동화",
      "shelfCode": "A-01-05",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Book by ID

```http
GET /api/books/:bookId
```

**Path Parameters:**
- `bookId`: Book identifier (ISBN or internal ID)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "bookId": "ISBN-001",
    "title": "별을 헤아리는 아이",
    "author": "김동화",
    "summary": "밤하늘의 별을 세며 꿈을 키워가는 소년의 이야기입니다...",
    "genre": "과학동화",
    "shelfCode": "A-01-05",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Book not found"
}
```

---

### Videos

#### Get Video Status

```http
GET /api/books/:bookId/video
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "READY",
    "requestCount": 15,
    "rankingScore": 42.5,
    "lastRequestedAt": "2024-01-15T10:30:00.000Z",
    "videoUrl": "/videos/ISBN-001.mp4",
    "subtitleUrl": "/videos/ISBN-001.vtt",
    "expiresAt": "2024-04-15T00:00:00.000Z"
  }
}
```

**Status Values:**
- `NONE`: No video exists
- `QUEUED`: Video generation queued
- `GENERATING`: Video being created
- `READY`: Video available
- `FAILED`: Generation failed

#### Request Video Generation (User)

```http
POST /api/books/:bookId/video
```

**Request Body:**
```json
{
  "trigger": "user_request"
}
```

**Response - Video Ready (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "READY",
    "message": "Video is ready"
  }
}
```

**Response - Video Queued (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "QUEUED",
    "message": "Video generation queued"
  }
}
```

**Response - In Progress (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "GENERATING",
    "message": "Video generation is in progress"
  }
}
```

---

### Recommendations

#### Get Ranked Recommendations

```http
GET /api/recommendations?type={type}&limit={limit}
```

**Query Parameters:**
- `type` (optional): Filter type - `video`, `new_arrival`, `librarian_pick`, `bestseller`
- `limit` (optional): Maximum results (default: 20, max: 50)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "bookId": "ISBN-001",
      "title": "별을 헤아리는 아이",
      "author": "김동화",
      "genre": "과학동화",
      "coverImageUrl": "/images/ISBN-001.jpg",
      "status": "READY",
      "requestCount": 35,
      "rankingScore": 70.4,
      "videoUrl": "/videos/ISBN-001.mp4"
    }
  ]
}
```

**Ranking Logic:**
- Items sorted by `rankingScore` (descending)
- `rankingScore = requestCount + (recent7DayRequests × 1.5)`
- READY videos prioritized

---

### Admin Endpoints

All admin endpoints require authentication.

#### Pre-Generate Video (Admin)

```http
POST /api/admin/books/:bookId/video
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "trigger": "admin_seed"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "QUEUED",
    "message": "Admin pre-generation queued"
  }
}
```

#### Update Video Expiration

```http
PATCH /api/admin/books/:bookId/video
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "expiresAt": "2026-03-01T00:00:00.000Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "bookId": "ISBN-001",
    "expiresAt": "2026-03-01T00:00:00.000Z"
  }
}
```

#### Create Book (Admin)

```http
POST /api/admin/books
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "bookId": "ISBN-999",
  "title": "새로운 책",
  "author": "작가명",
  "summary": "책 요약...",
  "genre": "창작동화",
  "shelfCode": "B-02-15"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "bookId": "ISBN-999",
    "title": "새로운 책",
    "author": "작가명",
    "summary": "책 요약...",
    "genre": "창작동화",
    "shelfCode": "B-02-15",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "success": false,
  "error": "Error message here"
}
```

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server error

---

## Rate Limiting

Currently no rate limiting is implemented. For production:

- Consider implementing rate limiting per IP/user
- Recommended: 100 requests per 15 minutes for public endpoints
- Recommended: 1000 requests per 15 minutes for authenticated endpoints

---

## Webhooks (Future)

Planned webhook support for video generation events:

```json
{
  "event": "video.ready",
  "bookId": "ISBN-001",
  "videoUrl": "/videos/ISBN-001.mp4",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

---

## OpenAPI/Swagger Specification

A complete OpenAPI 3.0 specification is available at:

```
GET /api/docs
```

For Swagger UI:

```
GET /api/docs/ui
```

---

## SDK / Client Libraries

Example usage with JavaScript/TypeScript:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Login
const { data } = await api.post('/auth/login', {
  username: 'admin',
  password: 'changeme123',
});

// Set token
api.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;

// Search books
const books = await api.get('/books', { params: { query: '별' } });

// Request video
const video = await api.post('/books/ISBN-001/video');
```

---

## Testing

Example cURL commands for testing:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"changeme123"}'

# Search books
curl "http://localhost:3000/api/books?query=별&limit=5"

# Get book
curl http://localhost:3000/api/books/ISBN-001

# Get video status
curl http://localhost:3000/api/books/ISBN-001/video

# Request video
curl -X POST http://localhost:3000/api/books/ISBN-001/video \
  -H "Content-Type: application/json"

# Get recommendations
curl "http://localhost:3000/api/recommendations?type=video&limit=10"

# Admin: Pre-generate video
curl -X POST http://localhost:3000/api/admin/books/ISBN-001/video \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```
