# Development Guide

Complete guide for developers working on the Smart DID Video Service.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Redis
- Git
- Code editor (VS Code recommended)

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your settings

# 3. Start Redis
redis-server

# 4. Run in development mode
npm run dev
```

## Development Workflow

### Daily Development

```bash
# Start all services
npm run dev

# Or individually
npm run dev:backend
npm run dev:frontend
npm run dev:worker
```

### Making Changes

1. **Create a feature branch**:
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**

3. **Run tests**:
```bash
npm test
```

4. **Lint and format**:
```bash
npm run lint
npm run format
```

5. **Commit and push**:
```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

## Project Architecture

### Monorepo Structure

This project uses npm workspaces:

```
packages/
├── shared/    # Shared types, utils
├── backend/   # API server
├── frontend/  # React app
└── worker/    # Video generation
```

### Adding Dependencies

```bash
# To a specific package
npm install axios --workspace=@smart-did/backend

# To root (dev dependencies)
npm install -D prettier

# To all packages
npm install lodash --workspaces
```

### Inter-Package Dependencies

Packages can reference each other:

```json
{
  "dependencies": {
    "@smart-did/shared": "*"
  }
}
```

## Backend Development

### Adding a New API Endpoint

1. **Create route handler** in `packages/backend/src/routes/`:

```typescript
// packages/backend/src/routes/book.routes.ts
router.get('/books/:id/reviews', async (req, res, next) => {
  try {
    const reviews = await bookService.getReviews(req.params.id);
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
});
```

2. **Add service method** in `packages/backend/src/services/`:

```typescript
// packages/backend/src/services/book.service.ts
async getReviews(bookId: string): Promise<Review[]> {
  // Implementation
}
```

3. **Add types** in `packages/shared/src/types/`:

```typescript
// packages/shared/src/types/book.types.ts
export interface Review {
  id: string;
  bookId: string;
  rating: number;
  comment: string;
}
```

4. **Write tests**:

```typescript
// packages/backend/src/__tests__/book.service.test.ts
describe('getReviews', () => {
  it('should return reviews for a book', async () => {
    // Test implementation
  });
});
```

### Database Operations

Currently using in-memory database. To add a new model:

```typescript
// packages/backend/src/db/index.ts
export class InMemoryDB {
  private reviews: Map<string, Review> = new Map();

  async getReviews(bookId: string): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(r => r.bookId === bookId);
  }
}
```

### Middleware

Add middleware in `packages/backend/src/middleware/`:

```typescript
// packages/backend/src/middleware/rate-limit.middleware.ts
export function rateLimitMiddleware(req, res, next) {
  // Rate limiting logic
}
```

Apply to routes:

```typescript
app.use('/api', rateLimitMiddleware);
```

## Frontend Development

### Adding a New Page

1. **Create page component**:

```typescript
// packages/frontend/src/pages/ReviewsPage.tsx
export function ReviewsPage() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    loadReviews();
  }, []);

  return (
    <div>
      {/* UI */}
    </div>
  );
}
```

2. **Add API call**:

```typescript
// packages/frontend/src/api/book.api.ts
export const bookApi = {
  async getReviews(bookId: string): Promise<Review[]> {
    const response = await apiClient.get(`/books/${bookId}/reviews`);
    return response.data.data;
  },
};
```

3. **Add route**:

```typescript
// packages/frontend/src/App.tsx
<Route path="/books/:id/reviews" element={<ReviewsPage />} />
```

### State Management

Using Zustand for state:

```typescript
// packages/frontend/src/stores/reviewStore.ts
import { create } from 'zustand';

interface ReviewState {
  reviews: Review[];
  loading: boolean;
  fetchReviews: (bookId: string) => Promise<void>;
}

export const useReviewStore = create<ReviewState>((set) => ({
  reviews: [],
  loading: false,
  fetchReviews: async (bookId: string) => {
    set({ loading: true });
    const reviews = await bookApi.getReviews(bookId);
    set({ reviews, loading: false });
  },
}));
```

### Styling

Use inline styles or CSS modules:

```tsx
// Inline styles
<div style={{ padding: '1rem', backgroundColor: '#f5f5f5' }}>
  Content
</div>

// CSS classes
<div className="container">
  Content
</div>
```

## Worker Development

### Video Generation Pipeline

The worker processes jobs in this order:

1. **Receive job** from queue
2. **Validate content** safety
3. **Generate prompts** for 3 scenes
4. **Call Veo3.1** for each scene
5. **Validate output** with safety filter
6. **Merge scenes** into single video
7. **Generate subtitles**
8. **Store files**
9. **Update database**

### Adding Custom Processing

```typescript
// packages/worker/src/services/video-generator.service.ts
async generateVideo(jobData: VideoJobData): Promise<GenerationResult> {
  // 1. Your custom pre-processing
  await this.customPreProcess(jobData);

  // 2. Generate scenes
  const scenes = promptService.generateAllScenes(...);

  // 3. Your custom post-processing
  await this.customPostProcess(scenes);

  return result;
}
```

### Integrating with Veo3.1

Replace mock implementation in `packages/worker/src/services/veo.service.ts`:

```typescript
async generateScene(scene: VideoScene): Promise<string> {
  const response = await this.client.post('/generate', {
    prompt: scene.prompt,
    duration: scene.duration,
    subtitles: scene.subtitleText,
    safetyFilter: 'strict',
  });

  return response.data.videoUrl;
}
```

## Testing

### Unit Tests

```typescript
// Example test
describe('VideoService', () => {
  beforeEach(async () => {
    await db.clear();
  });

  it('should create video record', async () => {
    const record = await videoService.getVideoRecord('TEST-001');
    expect(record.status).toBe(VideoStatus.NONE);
  });
});
```

### Integration Tests

```typescript
// Example API test
describe('POST /api/books/:id/video', () => {
  it('should queue video generation', async () => {
    const response = await request(app)
      .post('/api/books/TEST-001/video')
      .expect(200);

    expect(response.body.data.status).toBe('QUEUED');
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Specific package
npm test --workspace=@smart-did/backend
```

## Code Style

### TypeScript

- Use strict mode
- Define explicit return types
- Use interfaces over types for objects
- Avoid `any`, use `unknown` when needed

```typescript
// Good
interface Book {
  id: string;
  title: string;
}

async function getBook(id: string): Promise<Book> {
  // ...
}

// Avoid
function getBook(id) {
  // ...
}
```

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Components**: `PascalCase.tsx`
- **Functions**: `camelCase()`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase`

### Imports

Order imports:

```typescript
// 1. Node modules
import express from 'express';
import axios from 'axios';

// 2. Shared package
import { Book, VideoStatus } from '@smart-did/shared';

// 3. Local imports
import { db } from '../db';
import { logger } from '../config/logger';
```

## Debugging

### Backend Debugging

VS Code launch configuration (`.vscode/launch.json`):

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev:backend"],
  "skipFiles": ["<node_internals>/**"]
}
```

### Frontend Debugging

Use React DevTools browser extension and console.log:

```typescript
console.log('Book data:', book);
console.error('Error:', error);
```

### Worker Debugging

Add logging:

```typescript
logger.info('Processing job', { jobId: job.id, bookId: job.data.bookId });
logger.error('Generation failed', { error: error.message });
```

View logs:
```bash
tail -f packages/worker/logs/worker-combined.log
```

## Common Tasks

### Adding a New Video Scene

1. Update constants:
```typescript
// packages/shared/src/constants/video.constants.ts
export const VIDEO_CONSTANTS = {
  SCENE_COUNT: 4, // Changed from 3
  // ...
};
```

2. Add prompt generator:
```typescript
// packages/worker/src/services/prompt.service.ts
generateScene4Prompt(title: string): VideoScene {
  // Implementation
}
```

3. Update generation:
```typescript
// packages/worker/src/services/prompt.service.ts
generateAllScenes(...): VideoScene[] {
  return [
    this.generateScene1Prompt(...),
    this.generateScene2Prompt(...),
    this.generateScene3Prompt(...),
    this.generateScene4Prompt(...), // New
  ];
}
```

### Changing Video Expiry Default

```typescript
// .env
VIDEO_DEFAULT_EXPIRY_DAYS=120
```

Or in code:
```typescript
// packages/backend/src/config/index.ts
video: {
  defaultExpiryDays: 120,
}
```

### Adding a New User Role

1. Add to enum:
```typescript
// packages/shared/src/types/user.types.ts
export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator', // New
}
```

2. Update middleware:
```typescript
// packages/backend/src/middleware/auth.middleware.ts
export function moderatorMiddleware(req, res, next) {
  if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
}
```

## Environment Variables

### Development

```env
NODE_ENV=development
PORT=3000
REDIS_HOST=localhost
VEO_API_KEY=mock-key
```

### Production

```env
NODE_ENV=production
PORT=3000
REDIS_HOST=redis.production.internal
VEO_API_KEY=real-api-key
JWT_SECRET=strong-random-secret
```

### Accessing in Code

```typescript
import { config } from './config';

const apiKey = config.veo.apiKey;
```

## Database Migration (Future)

When migrating to PostgreSQL:

1. **Install Prisma**:
```bash
npm install @prisma/client --workspace=@smart-did/backend
npm install -D prisma --workspace=@smart-did/backend
```

2. **Initialize**:
```bash
cd packages/backend
npx prisma init
```

3. **Create schema**:
See `docs/ERD.md` for schema definition.

4. **Migrate**:
```bash
npx prisma migrate dev --name init
```

5. **Update services** to use Prisma client instead of in-memory DB.

## Troubleshooting

### "Cannot find module '@smart-did/shared'"

```bash
# Rebuild shared package
npm run build --workspace=@smart-did/shared
```

### "Redis connection refused"

```bash
# Check Redis status
redis-cli ping

# Start Redis
redis-server
```

### Port conflicts

```bash
# Change ports in .env
PORT=3001  # Backend
VITE_PORT=5174  # Frontend (in vite.config.ts)
```

## Best Practices

1. **Always write tests** for new features
2. **Use TypeScript strictly** - avoid `any`
3. **Log important events** using Winston
4. **Handle errors properly** - use try/catch and error middleware
5. **Validate inputs** - use express-validator
6. **Keep services small** - single responsibility
7. **Document complex logic** with comments
8. **Use environment variables** for configuration
9. **Follow naming conventions**
10. **Review code before committing**

## Resources

- [README.md](./README.md) - Project overview
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [docs/API.md](./docs/API.md) - API documentation
- [docs/ERD.md](./docs/ERD.md) - Database schema
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File structure

---

Happy coding! 🚀
