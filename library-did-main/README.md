# 꿈샘 도서관 AI 영상 서비스 (Smart DID Video Service)

> **마지막 업데이트**: 2026-03-04

아산 꿈샘 아동청소년 도서관을 위한 AI 기반 도서 소개 영상 자동 생성 서비스입니다.

## 핵심 기능

### 1. DID 키오스크 UI
- 신착 도서, 사서 추천, 연령대별 추천 도서 표시
- 도서 검색 및 상세 정보 조회
- AI 생성 영상 자동 재생 (종료 시 다시보기 버튼)
- 도서 위치 안내
- **9:16 세로 화면 비율** (키오스크 최적화)

### 2. 영상 자동 생성 시스템
- **Pipeline V7**: Grounding → Style Bible → Scene Planning → Sora Video → FFmpeg Assembly → Storage
- **Gemini 2.0 Flash**: 시나리오/스크립트 생성
- **Sora**: 영상 생성 (4초 × 3장면 = 12초 트레일러)
- **FFmpeg**: 3장면 크로스페이드 병합 + 자막 오버레이
- **네이버 책 검색 API**: 표지 이미지 및 책 소개 자동 수집

### 3. 관리자 대시보드
- 추천도서 등록 (제목/저자 입력 → 자동 영상 생성)
- 영상 생성 현황 모니터링 (책 제목/저자 표시)
- 큐 관리 (대기/생성중/완료/실패)
- 캐시 관리 (LRU 기반)
- **9:16 키오스크 비율 UI** (DID와 동일)

## 기술 스택

```
Frontend: React 18 + Vite + TypeScript + TailwindCSS + Zustand
Backend:  Fastify 5 + TypeScript + Prisma + PostgreSQL (Cloud SQL)
Queue:    BullMQ + Redis (Cloud Memorystore)
Worker:   BullMQ Worker + Pipeline V7 (Gemini + Sora)
Cloud:    GCP Cloud Run + Cloud SQL + Cloud Memorystore + Cloud Storage
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
│   │   │       ├── pipeline/  # Pipeline V7 (grounding/style/planning)
│   │   │       ├── services/  # Gemini, Sora, Storage 등
│   │   │       └── qc/        # 품질 검증 (Safety Gate 등)
│   │   │
│   │   └── shared/            # 공유 타입/유틸
│   │
│   └── docs/                  # 문서
│       ├── API.md             # API 레퍼런스
│       ├── ERD.md             # 데이터베이스 스키마
│       └── DEPLOYMENT.md      # 배포 가이드
│
├── Dockerfile.backend         # Backend Cloud Run 빌드
├── Dockerfile.frontend        # Frontend Cloud Run 빌드
├── Dockerfile.worker          # Worker Cloud Run 빌드
│
├── 개발_기록.md                # 개발 변경 이력
└── 아산도서관_개발_Final.md    # 기준 문서
```

## 영상 생성 흐름

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  Frontend   │───▶│   Backend    │───▶│      Redis       │───▶│    Worker    │
│  (Request)  │    │  (Queue API) │    │   (BullMQ 큐)    │    │ (Pipeline V7)│
└─────────────┘    └──────────────┘    └──────────────────┘    └──────────────┘
                          │                                           │
                          ▼                                           ▼
                   ┌──────────────┐                            ┌──────────────┐
                   │  Cloud SQL   │◀───────────────────────────│     GCS      │
                   │ (PostgreSQL) │      (콜백: 상태 업데이트)  │   Storage    │
                   └──────────────┘                            └──────────────┘
```

### Pipeline V7 상세 (12초 트레일러)

```
1. Book Grounding    → 책 정보 수집 (Naver/ALPAS/Google Books)
2. Style Bible       → 영상 스타일 결정 (Gemini)
3. Scene Planning    → 5요소 → 3장면 압축 (Gemini)
4. Sora Prompts      → 각 장면별 Sora 프롬프트 생성 (Gemini)
5. Video Generation  → Sora로 4초 × 3장면 영상 생성
6. Assembly          → FFmpeg 크로스페이드 병합 + 자막 오버레이
7. Storage & Callback → GCS 저장 후 Backend에 완료 알림
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
# Database (PostgreSQL)
DATABASE_URL=postgresql://smartdid:smartdid123@localhost:5432/smart_did

# Redis (BullMQ 큐)
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
OPENAI_API_KEY=YOUR_OPENAI_KEY    # Sora

# Storage
STORAGE_TYPE=local                 # local 또는 gcs
STORAGE_PATH=./storage/videos
# GCS_BUCKET=smart-did-storage-1  # GCS 사용 시

# 네이버 책 검색 API (표지 이미지 자동 조회)
NAVER_CLIENT_ID=YOUR_NAVER_CLIENT_ID
NAVER_CLIENT_SECRET=YOUR_NAVER_CLIENT_SECRET
```

### 3. PostgreSQL + Redis 실행 (Docker)

```bash
# Docker Compose로 실행
docker-compose up -d postgres redis

# 또는 개별 실행
docker run -d --name postgres \
  -e POSTGRES_USER=smartdid \
  -e POSTGRES_PASSWORD=smartdid123 \
  -e POSTGRES_DB=smart_did \
  -p 5432:5432 postgres:15-alpine

docker run -d --name redis -p 6379:6379 redis:alpine
```

### 4. 데이터베이스 초기화

```bash
cd packages/backend
npx prisma migrate deploy
npx prisma generate
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

## GCP Cloud Run 배포

### 필수 GCP 리소스

| 리소스 | 설명 |
|--------|------|
| Cloud SQL (PostgreSQL) | 데이터베이스 |
| Cloud Memorystore (Redis) | BullMQ 큐 |
| Cloud Storage | 영상 저장 |
| Cloud Run × 3 | Backend, Frontend, Worker |

### 환경변수 (Cloud Run)

**Backend & Worker 공통:**
```
DATABASE_URL=postgresql://postgres:PASSWORD@localhost/smart-did?host=/cloudsql/PROJECT:REGION:INSTANCE
REDIS_HOST=10.x.x.x  (Memorystore Internal IP)
REDIS_PORT=6379
JWT_SECRET=...
INTERNAL_API_SECRET=...
```

**Worker 추가:**
```
BACKEND_URL=https://smart-did-backend-xxx.run.app
STORAGE_TYPE=gcs
GCS_BUCKET=smart-did-storage-1
GEMINI_API_KEY=...
OPENAI_API_KEY=...
```

**Frontend:**
```
VITE_API_URL=https://smart-did-backend-xxx.run.app/api
```

### Cloud Run 설정

**Backend:**
- Cloud SQL Connection 추가
- VPC Connector 연결 (Redis 접근용)

**Worker:**
- Cloud SQL Connection 추가
- VPC Connector 연결 (Redis 접근용)
- Billing: **Instance-based** (백그라운드 워커)
- Minimum instances: 1
- CPU always allocated

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
| GET | `/admin/videos` | 영상 목록 (제목/저자 포함) |
| GET | `/admin/queue/stats` | 큐 상태 |
| POST | `/admin/recommendations` | 추천도서 등록 |
| DELETE | `/admin/recommendations/:id` | 추천도서 삭제 |
| POST | `/admin/cache/cleanup` | 캐시 정리 |

> 전체 API 문서: [docs/API.md](./docs/API.md)

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
  title           String?   // 책 제목
  author          String?   // 저자
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### Recommendation

```prisma
model Recommendation {
  id            String   @id @default(uuid())
  bookId        String   @unique  // REC-{uuid} 형식
  ageGroup      String   // preschool, elementary, teen
  title         String
  author        String
  publisher     String?
  summary       String?
  coverImageUrl String?
  category      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## 문서 목록

| 문서 | 설명 |
|------|------|
| [docs/API.md](./docs/API.md) | API 레퍼런스 (전체 엔드포인트) |
| [docs/ERD.md](./docs/ERD.md) | 데이터베이스 스키마 |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | GCP Cloud Run 배포 가이드 |
| [QUICKSTART.md](./QUICKSTART.md) | 빠른 시작 가이드 |
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | 개발 가이드 |

## Known Issues

- **FFmpeg 폰트**: Docker 환경에서 한글 폰트 필요 (`font-noto-cjk`)
- **외부 API 변동성**: Sora/Gemini 쿼터·권한·응답 지연 이슈 가능
- **콜백 실패 시**: Worker→Backend 콜백은 최대 3회 재시도(지수 백오프)

## 최근 변경사항 (2026-03-04)

- **큐 시스템**: BullMQ + Cloud Memorystore Redis 사용
- **영상 생성**: Pipeline V7 (12초 트레일러, Sora 기반)
- **Worker 상태**: GENERATING 상태 콜백 추가 (Admin에서 "생성중" 표시)
- **Admin UI**: 영상 목록에 책 제목/저자 표시
- **Docker**: Worker에 한글 폰트(Noto CJK) 추가

## 라이선스

Private - GenTA / Villion Inc.
