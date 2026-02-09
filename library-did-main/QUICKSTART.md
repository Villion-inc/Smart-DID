# Quick Start Guide

Get the Smart DID Video Service running in under 5 minutes.

## Prerequisites Check

```bash
# Check Node.js version (must be >= 18)
node --version

# Check npm version (must be >= 9)
npm --version

# Check if Redis is installed
redis-cli --version
```

If any are missing, install them first.

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

This will install all dependencies for all packages (backend, frontend, worker, shared).

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set required values:

```env
# Minimum required configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password_here
JWT_SECRET=generate_a_random_secret_key_here

# Veo3.1 API (get from Veo)
VEO_API_KEY=your_veo_api_key
VEO_API_ENDPOINT=https://api.veo.example.com/v1
```

### 3. Start Redis

**Option A: Using Homebrew (macOS)**
```bash
brew services start redis
```

**Option B: Using Docker**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

**Option C: Direct command**
```bash
redis-server
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### 4. Start All Services

```bash
npm run dev
```

This starts:
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **Worker**: Running in background

### 5. Verify Everything Works

**Check Backend Health:**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-15T10:00:00.000Z"}
```

**Open Frontend:**

Visit http://localhost:5173 in your browser.

**Test Login:**

1. Navigate to http://localhost:5173/admin/login
2. Login with credentials from `.env`
3. You should see the admin dashboard

## First Use

### Search for Books

1. Go to homepage (http://localhost:5173)
2. Search for "별" or any other keyword
3. Click on a book to view details

### Generate Your First Video

1. Click on a book (e.g., "별을 헤아리는 아이")
2. Click "영상 생성 요청" button
3. Video will be queued for generation
4. Watch the status change: QUEUED → GENERATING → READY

### Admin Functions

1. Login at http://localhost:5173/admin/login
2. Pre-generate videos for books
3. Monitor generation status
4. View all books and their video status

## Testing

Run tests:

```bash
# All tests
npm test

# Specific package
npm test --workspace=@smart-did/backend
```

## Troubleshooting

### "Cannot connect to Redis"

```bash
# Check if Redis is running
redis-cli ping

# If not, start it
brew services start redis
# or
redis-server
```

### "Port 3000 already in use"

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill

# Or change the port in .env
PORT=3001
```

### "Module not found" errors

```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json
npm install
```

### Frontend shows "Network Error"

Check that backend is running:
```bash
curl http://localhost:3000/health
```

If not running, restart:
```bash
npm run dev:backend
```

## Production Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:3000

### Manual Production Build

```bash
# Build all packages
npm run build

# Start backend
cd packages/backend
npm start

# Start worker
cd packages/worker
npm start

# Serve frontend (use nginx or similar)
cd packages/frontend
npm run preview
```

## Next Steps

1. **Configure Veo3.1 Integration**: Update worker to call actual Veo API
2. **Set Up Database**: Replace in-memory DB with PostgreSQL/MongoDB
3. **Configure ALPAS Integration**: Connect to library system
4. **Set Up SSL**: Use HTTPS in production
5. **Configure Monitoring**: Set up logging and alerts

## Development Tips

### Run Services Individually

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend

# Worker only
npm run dev:worker
```

### View Logs

Logs are written to:
- Backend: `packages/backend/logs/`
- Worker: `packages/worker/logs/`

### Seed Sample Data

Sample data is automatically seeded in development mode. To re-seed:

1. Stop the backend
2. Restart it (data is in-memory, so it resets)

### API Testing

Use the included API examples:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# Save the token
export TOKEN="your_jwt_token_here"

# Search books
curl http://localhost:3000/api/books?query=별

# Get book
curl http://localhost:3000/api/books/ISBN-001

# Request video
curl -X POST http://localhost:3000/api/books/ISBN-001/video

# Admin: Pre-generate (requires auth)
curl -X POST http://localhost:3000/api/admin/books/ISBN-002/video \
  -H "Authorization: Bearer $TOKEN"
```

## Support

- Check the main [README.md](./README.md) for detailed documentation
- See [docs/API.md](./docs/API.md) for API reference
- Review [docs/ERD.md](./docs/ERD.md) for database schema

---

**Ready to code!** Your Smart DID Video Service is now running. Start building amazing features for the library! 🚀
