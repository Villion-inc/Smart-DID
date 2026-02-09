# Project Structure

Complete file structure of the Smart DID Video Service project.

```
꿈샘-mvp/
│
├── packages/                           # Monorepo packages
│   │
│   ├── shared/                         # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── book.types.ts       # Book entity types
│   │   │   │   ├── video.types.ts      # Video entity types
│   │   │   │   ├── user.types.ts       # User/auth types
│   │   │   │   └── api.types.ts        # API request/response types
│   │   │   ├── constants/
│   │   │   │   └── video.constants.ts  # Video generation constants
│   │   │   ├── utils/
│   │   │   │   ├── ranking.utils.ts    # Ranking calculation
│   │   │   │   └── validation.utils.ts # Input validation
│   │   │   ├── __tests__/
│   │   │   │   └── validation.utils.test.ts
│   │   │   └── index.ts                # Exports
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── jest.config.js
│   │
│   ├── backend/                        # Backend API Server
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── index.ts            # Configuration loader
│   │   │   │   └── logger.ts           # Winston logger setup
│   │   │   ├── db/
│   │   │   │   ├── index.ts            # In-memory database
│   │   │   │   └── seed.ts             # Sample data seeder
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts  # JWT authentication
│   │   │   │   └── error.middleware.ts # Error handling
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts      # POST /api/auth/login
│   │   │   │   ├── book.routes.ts      # GET/POST /api/books/*
│   │   │   │   ├── recommendation.routes.ts # GET /api/recommendations
│   │   │   │   └── admin.routes.ts     # Admin endpoints
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts     # Authentication logic
│   │   │   │   ├── book.service.ts     # Book management
│   │   │   │   └── video.service.ts    # Video management
│   │   │   ├── queue/
│   │   │   │   └── index.ts            # BullMQ queue setup
│   │   │   ├── __tests__/
│   │   │   │   ├── auth.service.test.ts
│   │   │   │   └── video.service.test.ts
│   │   │   ├── app.ts                  # Express app setup
│   │   │   └── index.ts                # Server entry point
│   │   ├── logs/                       # Log files (gitignored)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── jest.config.js
│   │
│   ├── frontend/                       # React Frontend
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── client.ts           # Axios client setup
│   │   │   │   ├── auth.api.ts         # Auth API calls
│   │   │   │   ├── book.api.ts         # Book API calls
│   │   │   │   ├── recommendation.api.ts
│   │   │   │   └── admin.api.ts        # Admin API calls
│   │   │   ├── stores/
│   │   │   │   └── authStore.ts        # Zustand auth state
│   │   │   ├── pages/
│   │   │   │   ├── SearchPage.tsx      # Book search page
│   │   │   │   ├── BookDetailPage.tsx  # Book detail + video
│   │   │   │   ├── RecommendationsPage.tsx
│   │   │   │   └── admin/
│   │   │   │       ├── AdminLoginPage.tsx
│   │   │   │       └── AdminDashboard.tsx
│   │   │   ├── App.tsx                 # Main app component
│   │   │   ├── main.tsx                # React entry point
│   │   │   └── index.css               # Global styles
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── worker/                         # Video Generation Worker
│       ├── src/
│       │   ├── config/
│       │   │   ├── index.ts            # Configuration loader
│       │   │   └── logger.ts           # Winston logger setup
│       │   ├── services/
│       │   │   ├── prompt.service.ts   # Veo3.1 prompt generation
│       │   │   ├── veo.service.ts      # Veo3.1 API client
│       │   │   ├── storage.service.ts  # Video/subtitle storage
│       │   │   └── video-generator.service.ts # Main orchestrator
│       │   ├── __tests__/
│       │   │   └── prompt.service.test.ts
│       │   ├── worker.ts               # BullMQ worker setup
│       │   └── index.ts                # Worker entry point
│       ├── logs/                       # Log files (gitignored)
│       ├── package.json
│       ├── tsconfig.json
│       └── jest.config.js
│
├── docs/                               # Documentation
│   ├── API.md                          # Complete API reference
│   ├── ERD.md                          # Database schema
│   └── DEPLOYMENT.md                   # Production deployment guide
│
├── storage/                            # Local video storage (gitignored)
│   └── videos/                         # Generated videos
│
├── .env.example                        # Environment template
├── .env                                # Environment config (gitignored)
├── .gitignore                          # Git ignore rules
├── .eslintrc.json                      # ESLint config
├── .prettierrc.json                    # Prettier config
│
├── package.json                        # Root package (workspaces)
├── tsconfig.json                       # Root TypeScript config
│
├── Dockerfile.backend                  # Backend Docker image
├── Dockerfile.frontend                 # Frontend Docker image
├── Dockerfile.worker                   # Worker Docker image
├── docker-compose.yml                  # Docker Compose config
├── nginx.conf                          # Nginx configuration
│
├── README.md                           # Main documentation
├── QUICKSTART.md                       # Quick start guide
└── PROJECT_STRUCTURE.md                # This file
```

## Key Directories

### `/packages/shared`
Shared TypeScript types, constants, and utilities used across all packages.

**Important files:**
- `types/*.types.ts` - Type definitions for Book, Video, User, API
- `constants/video.constants.ts` - Video generation constants
- `utils/*.utils.ts` - Reusable utility functions

### `/packages/backend`
Express.js API server handling all HTTP requests.

**Important files:**
- `routes/*.routes.ts` - API endpoint definitions
- `services/*.service.ts` - Business logic
- `middleware/*.middleware.ts` - Auth and error handling
- `db/index.ts` - Database layer (currently in-memory)

**API Endpoints:**
- `POST /api/auth/login` - Admin login
- `GET /api/books` - Search books
- `GET /api/books/:id` - Get book details
- `GET /api/books/:id/video` - Get video status
- `POST /api/books/:id/video` - Request video generation
- `GET /api/recommendations` - Get ranked videos
- `POST /api/admin/books/:id/video` - Admin pre-generate

### `/packages/frontend`
React SPA built with Vite.

**Important files:**
- `pages/*.tsx` - Page components
- `api/*.api.ts` - API client functions
- `stores/*.ts` - State management (Zustand)

**Routes:**
- `/` - Search page
- `/books/:id` - Book detail page
- `/recommendations` - Recommendations page
- `/admin/login` - Admin login
- `/admin/dashboard` - Admin dashboard

### `/packages/worker`
BullMQ worker for video generation.

**Important files:**
- `services/prompt.service.ts` - Generates Veo3.1 prompts
- `services/veo.service.ts` - Calls Veo3.1 API
- `services/video-generator.service.ts` - Orchestrates generation
- `worker.ts` - BullMQ worker setup

**Process:**
1. Receives job from queue
2. Generates 3 scene prompts
3. Calls Veo3.1 for each scene
4. Validates safety
5. Merges scenes
6. Generates subtitles
7. Stores video + subtitle files
8. Updates database

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Auth**: JWT (jsonwebtoken)
- **Queue**: BullMQ + Redis
- **Logging**: Winston
- **Validation**: express-validator

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router v6
- **State**: Zustand
- **HTTP Client**: Axios

### Worker
- **Queue**: BullMQ
- **Video API**: Veo3.1
- **Storage**: Local filesystem (configurable to S3)

### DevOps
- **Container**: Docker
- **Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx
- **Testing**: Jest
- **Linting**: ESLint + Prettier

## Development Workflow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Frontend   │ (React on port 5173)
│   (Vite)    │
└──────┬──────┘
       │
       │ HTTP /api
       ▼
┌─────────────┐     ┌──────────────┐
│   Backend   │────▶│    Redis     │
│  (Express)  │     │    (Queue)   │
└──────┬──────┘     └──────┬───────┘
       │                   │
       │ DB Query          │ Dequeue
       ▼                   ▼
┌─────────────┐     ┌──────────────┐
│  Database   │     │    Worker    │
│ (In-Memory) │     │   (BullMQ)   │
└─────────────┘     └──────┬───────┘
                           │
                           │ Generate Video
                           ▼
                    ┌──────────────┐
                    │  Veo3.1 API  │
                    └──────────────┘
```

## Configuration Files

- `.env` - Environment variables
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - Linting rules
- `.prettierrc.json` - Code formatting
- `docker-compose.yml` - Service orchestration
- `nginx.conf` - Web server config
- `package.json` - Dependencies and scripts

## Build Output

When built (`npm run build`), each package creates a `dist/` directory:

```
packages/
├── shared/dist/          # Compiled TypeScript
├── backend/dist/         # Compiled server
├── frontend/dist/        # Static HTML/CSS/JS
└── worker/dist/          # Compiled worker
```

## Testing Structure

Tests are colocated with source code in `__tests__/` directories:

```
src/
├── services/
│   ├── auth.service.ts
│   └── __tests__/
│       └── auth.service.test.ts
```

Run tests:
```bash
npm test                              # All packages
npm test --workspace=@smart-did/backend  # Specific package
```

## Deployment Artifacts

**Docker Images:**
- `smart-did-backend:latest`
- `smart-did-frontend:latest`
- `smart-did-worker:latest`

**Volumes:**
- `redis_data` - Redis persistence
- `./storage` - Local video storage

## Code Organization Principles

1. **Shared First**: Common types/utils in `/shared`
2. **Service Layer**: Business logic isolated in services
3. **Type Safety**: Full TypeScript coverage
4. **API-First**: Backend exposes REST API
5. **Stateless Backend**: Can scale horizontally
6. **Queue-Based**: Async work via BullMQ
7. **Microservices Ready**: Each package can run independently

---

**Project Statistics:**

- Total Packages: 4 (shared, backend, frontend, worker)
- Total Source Files: ~50
- Lines of Code: ~5000
- API Endpoints: 10+
- Test Cases: 15+
- Docker Images: 3
