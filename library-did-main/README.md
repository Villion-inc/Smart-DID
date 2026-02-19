# 꿈샘 도서관 AI 영상 서비스 (Smart DID Video Service)

아산 꿈샘 아동청소년 도서관을 위한 AI 기반 도서 소개 영상 자동 생성 서비스입니다.

## 핵심 기능

### 1. 영상 자동 생성 시스템
- **베스트셀러 100권 사전 생성**: 인기 도서에 대한 영상을 미리 생성해둠
- **실시간 요청 처리**: 사용자가 요청한 책의 영상을 큐에 추가하여 생성
- **중복 방지**: 이미 생성 중이거나 완료된 영상은 재생성하지 않음

### 2. 스마트 캐시 관리 (LRU)
- **자동 삭제**: 잘 안 찾는 책의 영상은 오래된 것부터 자동 삭제
- **랭킹 시스템**: 조회수 + 최근성 기반 점수 산정
- **저장 공간 관리**: 최대 500개 영상 보관, 초과 시 LRU 방식 정리

### 3. 우선순위 기반 큐 시스템
- **사용자 요청**: 높은 우선순위 (Priority 5)
- **관리자 요청**: 최우선 순위 (Priority 1)
- **베스트셀러 시드**: 낮은 우선순위 (Priority 20)

## 기술 스택

```
Frontend: React 18 + Vite + TypeScript + TailwindCSS + Zustand
Backend:  Fastify + TypeScript + Prisma + SQLite
Queue:    Redis + BullMQ
Worker:   BullMQ Worker + Veo3.1 API
```

## 프로젝트 구조

```
lib-mvp/
├── packages/
│   ├── frontend/          # React SPA (일반 웹, DID, 관리자)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx              # 메인 페이지
│   │   │   │   ├── SearchPage.tsx        # 검색 페이지
│   │   │   │   ├── BookDetailPage.tsx    # 도서 상세
│   │   │   │   ├── did/                  # DID 터치 UI
│   │   │   │   │   ├── DidHome.tsx
│   │   │   │   │   └── DidBookDetail.tsx
│   │   │   │   └── admin/                # 관리자 대시보드
│   │   │   │       ├── AdminDashboard.tsx
│   │   │   │       └── VideoManagement.tsx
│   │   │   ├── components/
│   │   │   ├── api/
│   │   │   └── stores/
│   │   └── package.json
│   │
│   ├── backend/           # Fastify API Server
│   │   ├── src/
│   │   │   ├── index.ts              # 서버 엔트리포인트
│   │   │   ├── config/               # 환경설정
│   │   │   ├── routes/               # API 라우트
│   │   │   │   ├── did.routes.ts     # DID 공개 API
│   │   │   │   ├── admin.routes.ts   # 관리자 API
│   │   │   │   └── book.routes.ts    # 도서 API
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   │   ├── alpas.service.ts           # ALPAS 도서관 API 연동
│   │   │   │   ├── video.service.ts           # 영상 상태 관리
│   │   │   │   ├── queue.service.ts           # BullMQ 큐 관리
│   │   │   │   ├── cache-manager.service.ts   # LRU 캐시 관리
│   │   │   │   ├── bestseller-seed.service.ts # 베스트셀러 시드
│   │   │   │   └── scheduler.service.ts       # 주기적 작업
│   │   │   ├── repositories/
│   │   │   └── middleware/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── package.json
│   │
│   ├── worker/            # 영상 생성 워커
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── worker.ts             # BullMQ 워커
│   │   │   └── services/
│   │   │       ├── video-generator.service.ts  # 영상 생성 오케스트레이션
│   │   │       ├── veo.service.ts              # Veo3.1 API 연동
│   │   │       ├── prompt.service.ts           # 프롬프트 생성
│   │   │       └── storage.service.ts          # 파일 저장
│   │   └── package.json
│   │
│   └── shared/            # 공유 타입/유틸
│       └── src/
│           ├── types/
│           ├── constants/
│           └── utils/
│
├── docker-compose.yml
├── package.json
└── README.md
```

## 영상 생성 흐름

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Frontend   │───▶│   Backend    │───▶│    Redis    │───▶│    Worker    │
│  (Request)  │    │  (Queue API) │    │   (BullMQ)  │    │  (Veo3.1)    │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                          │                                       │
                          ▼                                       ▼
                   ┌──────────────┐                        ┌──────────────┐
                   │    SQLite    │◀───────────────────────│   Storage    │
                   │   (Prisma)   │                        │  (Local/S3)  │
                   └──────────────┘                        └──────────────┘
```

## 영상 상태 흐름

```
NONE ──▶ QUEUED ──▶ GENERATING ──▶ READY
                         │
                         ▼
                      FAILED ──▶ (재시도 가능)
```

## API 엔드포인트

### DID 공개 API (`/api/did`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/did/new-arrivals` | 신착 도서 목록 |
| GET | `/did/librarian-picks` | 사서 추천 도서 |
| GET | `/did/age/:group` | 연령대별 추천 (preschool/elementary/teen) |
| GET | `/did/search?q=keyword` | 도서 검색 (영상 상태 포함) |
| GET | `/did/books/:bookId` | 도서 상세 정보 |
| GET | `/did/books/:bookId/video` | 영상 상태 조회 |
| POST | `/did/books/:bookId/video/request` | 영상 생성 요청 |
| GET | `/did/videos/popular` | 인기 영상 목록 |

### 관리자 API (`/api/admin`) - 인증 필요

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/admin/dashboard/stats` | 대시보드 통계 |
| POST | `/admin/seed/bestsellers?limit=100` | 베스트셀러 시드 실행 |
| POST | `/admin/seed/age-group/:ageGroup` | 연령대별 시드 |
| GET | `/admin/seed/status` | 시드 상태 조회 |
| GET | `/admin/queue/stats` | 큐 상태 |
| GET | `/admin/queue/waiting` | 대기 작업 목록 |
| DELETE | `/admin/queue/:bookId` | 작업 취소 |
| POST | `/admin/queue/:bookId/retry` | 실패 작업 재시도 |
| GET | `/admin/cache/stats` | 캐시 통계 |
| POST | `/admin/cache/cleanup` | 수동 캐시 정리 |

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
# Server
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Database
DATABASE_URL="file:./dev.db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# Veo3.1 API (영상 생성)
VEO_API_KEY=your-veo-api-key
VEO_API_ENDPOINT=https://api.veo.example.com/v1

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./storage/videos

# Video Settings
VIDEO_DEFAULT_EXPIRY_DAYS=90
VIDEO_MAX_RETRIES=3
VIDEO_SCENE_DURATION=8

# Cache Settings
MAX_CACHED_VIDEOS=500
STALE_THRESHOLD_DAYS=30

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin1234
```

### 3. 데이터베이스 초기화

```bash
cd packages/backend
npx prisma migrate dev
npx prisma generate
npm run seed
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
# 전체 실행 (Backend + Frontend + Worker)
npm run dev

# 또는 개별 실행
npm run dev:backend   # Backend API
npm run dev:frontend  # Frontend React
npm run dev:worker    # Video Worker
```

### 6. 베스트셀러 시드 실행

관리자 로그인 후 API 호출:
```bash
# 베스트셀러 100권 사전 생성
curl -X POST http://localhost:3000/api/admin/seed/bestsellers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 데이터 모델

### VideoRecord

```prisma
model VideoRecord {
  bookId          String    @id
  status          String    @default("NONE")  // NONE, QUEUED, GENERATING, READY, FAILED
  requestCount    Int       @default(0)       // 조회 횟수
  lastRequestedAt DateTime?                   // 마지막 조회 시간
  retryCount      Int       @default(0)       // 재시도 횟수
  rankingScore    Float     @default(0)       // LRU 랭킹 점수
  expiresAt       DateTime?                   // 만료일
  videoUrl        String?                     // 영상 URL
  errorMessage    String?                     // 에러 메시지
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

## 랭킹 점수 계산

```
rankingScore = requestCount + recencyBoost

where:
  recencyBoost = requestCount × 1.5 × (1 - daysSinceLastRequest / 7)
  (최근 7일 이내 조회 시에만 적용)
```

## LRU 캐시 정리 규칙

1. **만료된 영상**: `expiresAt < now()` → 즉시 삭제
2. **최대 개수 초과**: `totalVideos > 500` → 낮은 점수부터 삭제
3. **미사용 영상**: `lastRequestedAt < 30일 전 AND requestCount < 3` → 삭제

## Docker 배포

```bash
# 전체 서비스 빌드 및 실행
docker-compose up -d

# 개별 서비스 빌드
docker build -f Dockerfile.backend -t smart-did-backend .
docker build -f Dockerfile.frontend -t smart-did-frontend .
docker build -f Dockerfile.worker -t smart-did-worker .
```

## API 문서

서버 실행 후 Swagger UI에서 확인:
- http://localhost:3000/documentation

## 연령대 구분

| 구분 | 키 | 검색 키워드 예시 |
|------|-----|-----------------|
| 유아 추천 | `preschool` | 그림책, 동화 |
| 아동 추천 | `elementary` | 과학, 역사, 모험 |
| 청소년 추천 | `teen` | 청소년, 소설 |

## 확인 필요 사항

- [ ] 유아/아동/청소년 추천이 단순 카테고리 분류인지, 별도 추천 로직이 필요한지
- [ ] ALPAS API Key 전달 여부
- [ ] 책 메타데이터 및 요약 데이터 형식 확인

## 라이선스

Private - GenTA
