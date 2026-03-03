# Quick Start Guide

> 5분 안에 프로젝트를 실행하는 가이드입니다.

## 사전 요구사항

- Node.js 18+
- Redis (Docker 권장)
- FFmpeg (영상 병합용, 선택)

## 1. 프로젝트 클론 및 설치

```bash
# 의존성 설치
npm install
```

## 2. 환경 변수 설정

```bash
cp .env.example .env
```

**필수 환경변수** (`.env` 파일 편집):

```env
DATABASE_URL=file:./dev.db
JWT_SECRET=your-secret-key-change-in-production-32chars
INTERNAL_API_SECRET=your-internal-secret-change-in-production
REDIS_HOST=localhost
REDIS_PORT=6379
BACKEND_URL=http://localhost:3001
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# 영상 생성 (둘 중 하나 이상)
OPENAI_API_KEY=YOUR_OPENAI_KEY
# VEO_API_KEY=YOUR_VEO_KEY

STORAGE_TYPE=local
STORAGE_PATH=./storage/videos
```

## 3. 데이터베이스 초기화

```bash
cd packages/backend
npm run prisma:migrate:deploy
npm run prisma:generate
cd ../..
```

## 4. Redis 실행

```bash
# Docker 사용
docker run -d -p 6379:6379 --name redis redis:alpine

# 또는 이미 실행 중인지 확인
docker ps | grep redis
```

## 5. 서비스 실행

```bash
# 전체 실행 (권장)
npm run dev
```

또는 터미널 3개에서 개별 실행:

```bash
# 터미널 1: Backend
npm run dev:backend

# 터미널 2: Frontend
npm run dev:frontend

# 터미널 3: Worker
npm run dev:worker
```

## 6. 접속 확인

| 서비스 | URL |
|--------|-----|
| DID 메인 | http://localhost:5173/did |
| 관리자 로그인 | http://localhost:5173/admin/login |
| API 문서 (Swagger) | http://localhost:3001/documentation |

## 7. 테스트

### 도서 검색 테스트

```bash
curl "http://localhost:3001/api/did/search?q=어린왕자"
```

### 영상 생성 요청 테스트

```bash
curl -X POST http://localhost:3001/api/did/books/70007968/video/request \
  -H "Content-Type: application/json" \
  -d '{"title":"어린왕자","author":"생텍쥐페리","summary":"사막에 불시착한 비행사가..."}'
```

## 트러블슈팅

### Redis 연결 실패

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

→ Redis가 실행 중인지 확인: `docker ps | grep redis`

### Prisma 오류

```
Error: Cannot find module '.prisma/client'
```

→ `cd packages/backend && npm run prisma:generate`

### Worker 키 미설정

```
GEMINI_API_KEY: NOT SET
```

→ `.env` 파일에 API 키가 설정되어 있는지 확인

### FFmpeg 미설치

영상 병합이 실패하면 첫 번째 장면만 저장됩니다. FFmpeg 설치:

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

## 다음 단계

- [docs/API.md](./docs/API.md) - API 레퍼런스
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 개발 가이드
- [개발_기록.md](../개발_기록.md) - 변경 이력
