# 꿈샘 도서관 AI 영상 서비스 (Smart DID Video Service)

> **마지막 업데이트**: 2026-02-28

아산 꿈샘 아동청소년 도서관을 위한 AI 기반 도서 소개 영상 자동 생성 서비스입니다.

## 핵심 기능

### 1. DID 키오스크 UI
- 신착 도서, 사서 추천, 연령대별 추천 도서 표시
- 도서 검색 및 상세 정보 조회
- AI 생성 영상 자동 재생 (종료 시 다시보기 버튼)
- 도서 위치 안내

### 2. 영상 자동 생성 시스템
- **Pipeline V2**: Grounding → Style Bible → Scene Planning → Video Generation → Subtitles → Merge
- **Gemini 2.0 Flash**: 시나리오/스크립트 생성
- **Veo 3.1 / Sora**: 영상 생성
- **FFmpeg**: 3장면 병합 + 자막 burn

### 3. 관리자 대시보드
- 영상 생성 현황 모니터링
- 큐 관리 (대기/진행/완료/실패)
- 베스트셀러/연령대별 시드 실행
- 캐시 관리 (LRU 기반)

## 기술 스택

```
Frontend: React 18 + Vite + TypeScript + TailwindCSS + Zustand
Backend:  Fastify 5 + TypeScript + Prisma + SQLite
Queue:    Redis + BullMQ
Worker:   BullMQ Worker + Pipeline V2 (Gemini + Veo/Sora)
```

## 프로젝트 구조

```
lib-mvp/
├── library-did-main/
│   ├── packages/
│   │   ├── frontend/          # React SPA (DID + 관리자)
│   │   │   └── src/pages/
│   │   │       ├── did/       # DID 키오스크 UI
│   │   │       └── admin/     # 관리자 대시보드
│   │   │
│   │   ├── backend/           # Fastify API Server
│   │   │   └── src/
│   │   │       ├── routes/    # API 라우트
│   │   │       ├── controllers/
│   │   │       ├── services/  # ALPAS 연동, 영상 관리 등
│   │   │       └── repositories/
│   │   │
│   │   ├── worker/            # 영상 생성 워커
│   │   │   └── src/
│   │   │       ├── pipeline/  # Pipeline V2 (grounding/style/planning)
│   │   │       ├── services/  # Gemini, Veo, Storage 등
│   │   │       └── qc/        # 품질 검증 (Safety Gate 등)
│   │   │
│   │   └── shared/            # 공유 타입/유틸
│   │
│   └── docs/                  # 문서
│       ├── API.md             # API 레퍼런스
│       ├── ERD.md             # 데이터베이스 스키마
│       └── DEPLOYMENT.md      # 배포 가이드
│
├── genta_video_engine/        # 독립 영상 생성 엔진 (A/B 테스트, QC Agent)
│
├── 개발_기록.md                # 개발 변경 이력
└── 아산도서관_개발_Final.md    # 기준 문서
```

## 영상 생성 흐름

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Frontend   │───▶│   Backend    │───▶│    Redis    │───▶│    Worker    │
│  (Request)  │    │  (Queue API) │    │   (BullMQ)  │    │ (Pipeline V2)│
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                          │                                       │
                          ▼                                       ▼
                   ┌──────────────┐                        ┌──────────────┐
                   │    SQLite    │◀───────────────────────│   Storage    │
                   │   (Prisma)   │      (Callback)        │  (Local/S3)  │
                   └──────────────┘                        └──────────────┘
```

### Pipeline V2 상세

```
1. Book Grounding    → 책 정보 수집 및 검증
2. Style Bible       → 영상 스타일 결정
3. Scene Planning    → 3장면 시나리오 생성
4. Video Generation  → Veo/Sora로 각 장면 영상 생성
5. Subtitle Gen      → VTT 자막 생성
6. Assembly          → FFmpeg로 3장면 병합 + 자막 burn
7. Storage & Callback → 저장 후 Backend에 완료 알림
```

## 영상 상태 흐름

```
NONE ──▶ QUEUED ──▶ GENERATING ──▶ READY
                         │
                         ▼
                      FAILED ──▶ (재시도 가능)
```

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일 편집:
```env
# Database
DATABASE_URL=file:./dev.db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (관리자 인증)
JWT_SECRET=your-secret-key-change-in-production-32chars

# Internal API (Worker ↔ Backend 통신)
INTERNAL_API_SECRET=your-internal-secret-change-in-production

# Backend URL (Worker가 콜백할 주소)
BACKEND_URL=http://localhost:3001

# AI API Keys
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# 영상 생성 (둘 중 하나 이상 필요)
OPENAI_API_KEY=YOUR_OPENAI_KEY    # Sora
# VEO_API_KEY=YOUR_VEO_KEY        # Veo 3.1

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./storage/videos
```

### 3. 데이터베이스 초기화

```bash
cd packages/backend
npm run prisma:migrate:deploy
npm run prisma:generate
```

### 4. Redis 실행

```bash
# Docker로 Redis 실행
docker run -d -p 6379:6379 redis:alpine

# 또는 docker-compose 사용
docker-compose up -d redis
```

### 5. 개발 서버 실행

```bash
# 루트에서 전체 실행 (Backend + Frontend + Worker)
npm run dev

# 또는 개별 실행
npm run dev:backend   # Backend API (포트 3001)
npm run dev:frontend  # Frontend React (포트 5173)
npm run dev:worker    # Video Worker
```

### 6. 접속

- **DID 메인**: http://localhost:5173/did
- **관리자**: http://localhost:5173/admin/login
- **API 문서**: http://localhost:3001/documentation

## API 엔드포인트 요약

### DID 공개 API (`/api/did`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/did/new-arrivals` | 신착 도서 목록 |
| GET | `/did/librarian-picks` | 사서 추천 도서 |
| GET | `/did/age/:group` | 연령대별 추천 |
| GET | `/did/search?q=keyword` | 도서 검색 |
| GET | `/did/books/:bookId` | 도서 상세 정보 |
| GET | `/did/books/:bookId/video` | 영상 상태 조회 |
| POST | `/did/books/:bookId/video/request` | 영상 생성 요청 |

### 관리자 API (`/api/admin`) - 인증 필요

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/admin/dashboard/stats` | 대시보드 통계 |
| GET | `/admin/queue/stats` | 큐 상태 |
| POST | `/admin/seed/bestsellers` | 베스트셀러 시드 |
| POST | `/admin/cache/cleanup` | 캐시 정리 |

> 전체 API 문서: [docs/API.md](./docs/API.md)

## 도서관 서버 배포 (10.10.11.13/METIS)

도서관 측 서버에 `/METIS` 경로로 서비스하는 경우:

- **DID 접속**: `http://10.10.11.13/METIS`
- **관리자**: `http://10.10.11.13/METIS/admin/login`
- **SSL**: 아산시 인증서는 도서관 측 리버스 프록시에서 적용

```bash
# 프론트 빌드 (base path 설정)
cd packages/frontend
VITE_BASE_PATH=/METIS npm run build
```

## 데이터 모델

### VideoRecord

```prisma
model VideoRecord {
  bookId          String    @id
  status          String    @default("NONE")
  videoUrl        String?
  subtitleUrl     String?
  requestCount    Int       @default(0)
  lastRequestedAt DateTime?
  retryCount      Int       @default(0)
  rankingScore    Float     @default(0)
  expiresAt       DateTime?
  errorMessage    String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

## 문서 목록

| 문서 | 설명 |
|------|------|
| [docs/API.md](./docs/API.md) | API 레퍼런스 (전체 엔드포인트) |
| [docs/ERD.md](./docs/ERD.md) | 데이터베이스 스키마 |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | 배포 가이드 |
| [개발_기록.md](../개발_기록.md) | 개발 변경 이력 |
| [QUICKSTART.md](./QUICKSTART.md) | 빠른 시작 가이드 |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | 개발 가이드 |

## Known Issues

- **FFmpeg 의존성**: 설치/실행 환경에 따라 병합 단계가 실패할 수 있음 → 실패 시 "첫 장면만 저장" fallback 동작
- **외부 API 변동성**: Sora/Veo/Gemini 쿼터·권한·응답 지연 이슈 가능
- **콜백 실패 시**: Worker→Backend 콜백은 최대 3회 재시도(지수 백오프)

## 라이선스

Private - GenTA / Villion Inc.
