# Smart DID Backend API

Backend API service for the Smart DID Video Service - a library system that generates AI-powered video summaries of children's books.

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Fastify (high-performance web framework)
- **Database**: SQLite via Prisma ORM (easily swappable to PostgreSQL/MySQL)
- **Validation**: Zod
- **Authentication**: JWT via @fastify/jwt
- **Documentation**: Swagger/OpenAPI

## Architecture

Clean architecture with clear separation of concerns:

```
src/
├── config/          # Configuration and database setup
├── types/           # TypeScript type definitions
├── schemas/         # Zod validation schemas
├── repositories/    # Data access layer
├── services/        # Business logic layer
│   ├── alpas.service.ts    # Mock ALPAS connector (replaceable)
│   ├── auth.service.ts
│   ├── book.service.ts
│   ├── video.service.ts
│   └── notification.service.ts
├── controllers/     # Request handlers
├── middleware/      # Auth middleware
└── routes/          # API routes
```

## Setup Instructions

### Prerequisites

- Node.js >= 18.0.0
- npm or pnpm

### Installation

1. **Navigate to backend directory:**
   ```bash
   cd packages/backend
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL="file:./dev.db"
   JWT_SECRET=your-secret-key-change-in-production
   JWT_EXPIRES_IN=7d
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin1234
   ```

4. **Generate Prisma client:**
   ```bash
   pnpm prisma:generate
   ```

5. **Run database migrations:**
   ```bash
   pnpm prisma:migrate
   ```

   When prompted for migration name, enter: `init`

6. **Seed the database:**
   ```bash
   pnpm seed
   ```

   This creates:
   - Admin user (username: admin, password: admin1234)
   - Shelf map positions for 20 books
   - 3 sample video records

### Running the Server

**Development mode (with auto-reload):**
```bash
pnpm dev
```

**Production mode:**
```bash
pnpm build
pnpm start
```

The server will start on `http://localhost:3000`

### API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/documentation
- **Health Check**: http://localhost:3000/api/health

## API Endpoints

### Public Endpoints

#### Health Check
```
GET /api/health
```

Returns server status.

#### Search Books
```
GET /api/books?keyword=별
```

**Query Parameters:**
- `keyword` (optional): Search term for title, author, or category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "BK001",
      "title": "별을 헤아리며",
      "author": "김미영",
      "publisher": "창비",
      "publishedYear": 2024,
      "isbn": "9788936447236",
      "summary": "어린 소녀가 별을 관찰하며...",
      "callNumber": "813.8-김39ㅂ",
      "registrationNumber": "R202401001",
      "shelfCode": "1A",
      "isAvailable": true,
      "category": "아동문학"
    }
  ]
}
```

#### Get Book Details
```
GET /api/books/:bookId
```

Returns detailed information about a specific book.

#### Get Video Status
```
GET /api/books/:bookId/video
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookId": "BK001",
    "status": "READY",
    "requestCount": 15,
    "lastRequestedAt": "2024-01-14T12:00:00Z",
    "expiresAt": "2024-04-14T12:00:00Z",
    "videoUrl": "https://example.com/video.mp4",
    "rankingScore": 22.5
  }
}
```

**Status Values:**
- `NONE`: No video exists
- `QUEUED`: Waiting for generation
- `GENERATING`: Currently being generated
- `READY`: Video is available
- `FAILED`: Generation failed

#### Request Video Generation (User)
```
POST /api/books/:bookId/video
```

Requests video generation for a book. Behavior depends on current status:
- `READY`: Increments request count and updates ranking
- `QUEUED/GENERATING`: Returns current status
- `NONE/FAILED`: Queues for generation

### Admin Endpoints (Protected)

All admin endpoints require JWT authentication:
```
Authorization: Bearer <token>
```

#### Login
```
POST /api/auth/login

{
  "username": "admin",
  "password": "admin1234"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "username": "admin",
    "role": "admin"
  }
}
```

#### Get Current User
```
GET /api/auth/me
```

Returns authenticated user information.

#### Get New Arrivals
```
GET /api/admin/recommendations/new-arrivals
```

Returns recently added books (mock data).

#### Get Librarian Picks
```
GET /api/admin/recommendations/librarian-picks
```

Returns librarian-recommended books (mock data).

#### Admin Video Generation Request
```
POST /api/admin/books/:bookId/video
```

Admin-initiated video generation request (tracked separately for analytics).

#### Get Videos by Status
```
GET /api/admin/videos?status=READY
```

**Query Parameters:**
- `status` (optional): Filter by status (NONE, QUEUED, GENERATING, READY, FAILED)

Returns all video records, optionally filtered by status.

#### Update Video
```
PATCH /api/admin/books/:bookId/video

{
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

Or update status:
```json
{
  "status": "READY"
}
```

#### Get Notifications
```
GET /api/admin/notifications?take=20&skip=0&isRead=false
```

**Query Parameters:**
- `take` (optional): Number of notifications to return
- `skip` (optional): Number to skip (pagination)
- `isRead` (optional): Filter by read status

#### Mark Notification as Read
```
PATCH /api/admin/notifications/:id/read
```

#### Mark All Notifications as Read
```
POST /api/admin/notifications/mark-all-read
```

## Data Models

### AdminUser
- `id`: UUID
- `username`: Unique username
- `passwordHash`: Bcrypt hashed password
- `role`: User role (default: "admin")

### VideoRecord
- `bookId`: Primary key (references book ID from ALPAS)
- `status`: Enum (NONE, QUEUED, GENERATING, READY, FAILED)
- `requestCount`: Total number of requests
- `lastRequestedAt`: Timestamp of last request
- `retryCount`: Number of failed attempts
- `rankingScore`: Calculated ranking score
- `expiresAt`: Video expiration date
- `videoUrl`: URL to generated video
- `errorMessage`: Error details if failed

### ShelfMap
- `id`: UUID
- `bookId`: Unique book identifier
- `shelfCode`: Shelf location code (e.g., "1A", "2B")
- `mapX`: X coordinate on shelf map
- `mapY`: Y coordinate on shelf map

### Notification
- `id`: UUID
- `type`: Notification type
- `message`: Notification message
- `isRead`: Read status
- `createdAt`: Creation timestamp

## Business Logic

### Video Ranking Algorithm

Videos are ranked using:
```
rankingScore = requestCount + recencyBoost
```

Where `recencyBoost` is calculated as:
- Requests within last 7 days: Linear decay from 1.5x to 0x
- Older requests: No boost

Example:
- Book with 10 requests, last requested 2 days ago: `10 + (10 × 1.5 × 0.71) = 20.65`
- Book with 10 requests, last requested 10 days ago: `10 + 0 = 10`

### Video State Machine

```
NONE ────► QUEUED ────► GENERATING ────► READY
              │                              │
              │                              │
              └──────────► FAILED ◄──────────┘
```

- **NONE → QUEUED**: User or admin requests video
- **QUEUED → GENERATING**: Worker picks up job (not implemented in MVP)
- **GENERATING → READY**: Video generation succeeds
- **GENERATING → FAILED**: Video generation fails
- **FAILED → QUEUED**: Retry request
- **READY**: Video can be reused, request increments count

## Mock ALPAS Connector

The `AlpasService` provides mock data for 35 children's books. To replace with real ALPAS integration:

1. Update `src/services/alpas.service.ts`
2. Implement actual API calls to ALPAS system
3. Map ALPAS response format to our `Book` type

## Database Management

### View Database
```bash
pnpm prisma:studio
```

Opens Prisma Studio GUI at http://localhost:5555

### Create Migration
```bash
pnpm prisma:migrate
```

### Reset Database
```bash
rm prisma/dev.db
pnpm prisma:migrate
pnpm seed
```

## Testing

Example API calls using curl:

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}'
```

**Search Books:**
```bash
curl http://localhost:3000/api/books?keyword=별
```

**Get Video Status:**
```bash
curl http://localhost:3000/api/books/BK001/video
```

**Admin: Get Videos:**
```bash
TOKEN="your-jwt-token"
curl http://localhost:3000/api/admin/videos \
  -H "Authorization: Bearer $TOKEN"
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `500`: Internal server error

## Switching to PostgreSQL/MySQL

To switch from SQLite:

1. **Update `prisma/schema.prisma`:**
   ```prisma
   datasource db {
     provider = "postgresql"  // or "mysql"
     url      = env("DATABASE_URL")
   }
   ```

2. **Update `.env`:**
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/smartdid"
   ```

3. **Run migrations:**
   ```bash
   pnpm prisma:migrate
   ```

## Production Considerations

- Change `JWT_SECRET` to a strong random value
- Update `ADMIN_PASSWORD`
- Use environment-specific `.env` files
- Set up proper database backups
- Configure reverse proxy (nginx/caddy)
- Enable rate limiting
- Set up monitoring and logging
- Use production-grade database (PostgreSQL)

## Support

For issues or questions, check:
- API Documentation: http://localhost:3000/documentation
- Prisma Schema: `prisma/schema.prisma`
- Example seed data: `prisma/seed.ts`
