# Smart DID Video Service - Documentation Index

Quick reference guide to all project documentation.

## 🚀 Getting Started (Start Here!)

1. **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** ⭐
   - Complete project overview
   - What's included
   - Quick start commands
   - Success checklist

2. **[QUICKSTART.md](./QUICKSTART.md)** ⭐
   - 5-minute setup guide
   - Step-by-step installation
   - First-time use instructions
   - Common troubleshooting

3. **[README.md](./README.md)**
   - Main project documentation
   - Architecture overview
   - Features and usage
   - Configuration guide

## 👨‍💻 Development

4. **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)**
   - Daily development workflow
   - Adding new features
   - Code style guide
   - Testing guide
   - Debugging tips
   - Best practices

5. **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)**
   - Complete file structure
   - Package organization
   - Technology stack
   - Build process

## 📚 API & Database

6. **[docs/API.md](./docs/API.md)**
   - Complete API reference
   - All endpoints documented
   - Request/response examples
   - Error codes
   - cURL examples

7. **[docs/ERD.md](./docs/ERD.md)**
   - Database schema
   - Entity relationships
   - Field descriptions
   - Sample data
   - Migration notes

## 🚢 Deployment

8. **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**
   - Production deployment
   - Docker setup
   - Manual deployment
   - Database migration
   - Monitoring & logging
   - Security checklist
   - Backup & recovery

## 📖 Quick Reference

### For New Developers

Start with these in order:
1. [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Understand what was built
2. [QUICKSTART.md](./QUICKSTART.md) - Get it running
3. [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - Start coding

### For API Integration

1. [docs/API.md](./docs/API.md) - API documentation
2. [README.md](./README.md) - Authentication guide

### For DevOps/Deployment

1. [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
2. [docker-compose.yml](./docker-compose.yml) - Docker configuration

### For Database Work

1. [docs/ERD.md](./docs/ERD.md) - Database schema
2. [packages/backend/src/db/](./packages/backend/src/db/) - Database code

## 📂 File Locations

### Configuration Files
- `.env.example` - Environment template
- `package.json` - Root dependencies
- `tsconfig.json` - TypeScript config
- `.eslintrc.json` - Linting rules
- `.prettierrc.json` - Code formatting
- `docker-compose.yml` - Docker services

### Source Code
- `packages/shared/src/` - Shared types and utils
- `packages/backend/src/` - Backend API
- `packages/frontend/src/` - React app
- `packages/worker/src/` - Video worker

### Tests
- `packages/backend/src/__tests__/` - Backend tests
- `packages/shared/src/__tests__/` - Shared tests
- `packages/worker/src/__tests__/` - Worker tests

### Docker
- `Dockerfile.backend` - Backend container
- `Dockerfile.frontend` - Frontend container
- `Dockerfile.worker` - Worker container
- `nginx.conf` - Nginx configuration

## 🔍 Find Documentation By Topic

### Authentication & Security
- **Admin Login**: [docs/API.md](./docs/API.md#authentication)
- **JWT Setup**: [README.md](./README.md#-configuration)
- **Security**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md#security)

### Books
- **Search Books**: [docs/API.md](./docs/API.md#search-books)
- **Book Schema**: [docs/ERD.md](./docs/ERD.md#book)
- **Book Service**: [packages/backend/src/services/book.service.ts](./packages/backend/src/services/book.service.ts)

### Videos
- **Video Generation**: [README.md](./README.md#-video-generation)
- **Video State Machine**: [README.md](./README.md#-video-state-machine)
- **Video API**: [docs/API.md](./docs/API.md#videos)
- **Video Schema**: [docs/ERD.md](./docs/ERD.md#videorecord)
- **Worker Logic**: [packages/worker/src/services/video-generator.service.ts](./packages/worker/src/services/video-generator.service.ts)

### Ranking
- **Ranking Algorithm**: [README.md](./README.md#-ranking-algorithm)
- **Recommendations API**: [docs/API.md](./docs/API.md#get-ranked-recommendations)
- **Ranking Utils**: [packages/shared/src/utils/ranking.utils.ts](./packages/shared/src/utils/ranking.utils.ts)

### Queue & Workers
- **Queue Setup**: [packages/backend/src/queue/index.ts](./packages/backend/src/queue/index.ts)
- **Worker**: [packages/worker/src/worker.ts](./packages/worker/src/worker.ts)
- **BullMQ Config**: [README.md](./README.md#-architecture)

### Veo3.1 Integration
- **Prompt Generation**: [packages/worker/src/services/prompt.service.ts](./packages/worker/src/services/prompt.service.ts)
- **Veo Service**: [packages/worker/src/services/veo.service.ts](./packages/worker/src/services/veo.service.ts)
- **Video Constants**: [packages/shared/src/constants/video.constants.ts](./packages/shared/src/constants/video.constants.ts)

### Frontend
- **Search Page**: [packages/frontend/src/pages/SearchPage.tsx](./packages/frontend/src/pages/SearchPage.tsx)
- **Book Detail**: [packages/frontend/src/pages/BookDetailPage.tsx](./packages/frontend/src/pages/BookDetailPage.tsx)
- **Admin Dashboard**: [packages/frontend/src/pages/admin/AdminDashboard.tsx](./packages/frontend/src/pages/admin/AdminDashboard.tsx)
- **API Client**: [packages/frontend/src/api/](./packages/frontend/src/api/)

### Testing
- **Testing Guide**: [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#testing)
- **Backend Tests**: [packages/backend/src/__tests__/](./packages/backend/src/__tests__/)
- **Jest Config**: [packages/backend/jest.config.js](./packages/backend/jest.config.js)

### Deployment
- **Docker Deployment**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md#docker-deployment)
- **Manual Deployment**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md#manual-deployment)
- **Environment Setup**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md#environment-setup)

## 💡 Common Questions

**Q: How do I start the project?**
A: See [QUICKSTART.md](./QUICKSTART.md)

**Q: How do I add a new API endpoint?**
A: See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#adding-a-new-api-endpoint)

**Q: What's the database schema?**
A: See [docs/ERD.md](./docs/ERD.md)

**Q: How does video generation work?**
A: See [README.md](./README.md#-video-generation)

**Q: How do I deploy to production?**
A: See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

**Q: Where are the API endpoints?**
A: See [docs/API.md](./docs/API.md)

**Q: How do I run tests?**
A: See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#testing)

**Q: What technologies are used?**
A: See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md#technology-stack)

**Q: How do I add a new page to the frontend?**
A: See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md#adding-a-new-page)

**Q: How does the ranking system work?**
A: See [README.md](./README.md#-ranking-algorithm)

## 🎯 Quick Commands

```bash
# Setup
npm install
cp .env.example .env

# Development
npm run dev              # All services
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run dev:worker       # Worker only

# Testing
npm test                 # All tests
npm test --workspace=@smart-did/backend

# Production
npm run build            # Build all
docker-compose up -d     # Deploy

# Code Quality
npm run lint             # Lint
npm run format           # Format
```

## 📊 Project Stats

- **Total Files**: ~60 TypeScript/React files
- **Lines of Code**: ~5,000
- **Packages**: 4 (shared, backend, frontend, worker)
- **API Endpoints**: 10+
- **Test Cases**: 15+
- **Documentation**: 8 guides

## 📞 Need Help?

1. Check this index for relevant documentation
2. Search documentation files for keywords
3. Review example code in test files
4. Check troubleshooting sections in guides

## 🗂️ All Documentation Files

1. [INDEX.md](./INDEX.md) - This file
2. [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Project overview
3. [README.md](./README.md) - Main documentation
4. [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
5. [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - Developer guide
6. [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - File structure
7. [docs/API.md](./docs/API.md) - API reference
8. [docs/ERD.md](./docs/ERD.md) - Database schema
9. [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide

---

**Start here**: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) → [QUICKSTART.md](./QUICKSTART.md) → [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
