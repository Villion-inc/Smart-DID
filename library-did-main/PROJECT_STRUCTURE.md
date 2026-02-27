# Project Structure

> **마지막 업데이트**: 2026-02-28

Smart DID Video Service 프로젝트의 파일 구조입니다.

```
lib-mvp/
├── library-did-main/
│   ├── packages/
│   │   ├── shared/                    # 공유 타입/유틸
│   │   │   └── src/
│   │   │       ├── types/             # 공통 타입 정의
│   │   │       └── index.ts
│   │   │
│   │   ├── backend/                   # Fastify API Server
│   │   │   ├── src/
│   │   │   │   ├── config/            # 환경설정
│   │   │   │   ├── routes/            # API 라우트
│   │   │   │   │   ├── did.routes.ts      # DID 공개 API
│   │   │   │   │   ├── admin.routes.ts    # 관리자 API
│   │   │   │   │   ├── auth.routes.ts     # 인증 API
│   │   │   │   │   ├── internal.routes.ts # Worker 콜백
│   │   │   │   │   └── video.routes.ts    # 영상 파일 서빙
│   │   │   │   ├── controllers/       # 요청 핸들러
│   │   │   │   ├── services/          # 비즈니스 로직
│   │   │   │   │   ├── alpas-real.service.ts  # ALPAS API 연동
│   │   │   │   │   ├── queue.service.ts       # BullMQ 큐
│   │   │   │   │   └── video.service.ts       # 영상 상태 관리
│   │   │   │   ├── repositories/      # DB 접근 계층
│   │   │   │   └── middleware/        # 인증 등
│   │   │   ├── prisma/
│   │   │   │   ├── schema.prisma      # DB 스키마
│   │   │   │   └── dev.db             # SQLite DB (개발용)
│   │   │   └── package.json
│   │   │
│   │   ├── frontend/                  # React SPA
│   │   │   ├── src/
│   │   │   │   ├── api/               # API 클라이언트
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── did.api.ts
│   │   │   │   │   └── admin.api.ts
│   │   │   │   ├── pages/
│   │   │   │   │   ├── did/           # DID 키오스크 UI
│   │   │   │   │   │   ├── DidV2Home.tsx
│   │   │   │   │   │   ├── DidV2BookDetail.tsx
│   │   │   │   │   │   ├── DidV2Location.tsx
│   │   │   │   │   │   └── DidV2Layout.tsx
│   │   │   │   │   └── admin/         # 관리자 대시보드
│   │   │   │   │       ├── Dashboard.tsx
│   │   │   │   │       ├── Login.tsx
│   │   │   │   │       └── AdminLayout.tsx
│   │   │   │   ├── stores/            # Zustand 상태관리
│   │   │   │   └── App.tsx
│   │   │   └── package.json
│   │   │
│   │   └── worker/                    # 영상 생성 워커
│   │       ├── src/
│   │       │   ├── config/            # 환경설정
│   │       │   ├── pipeline/          # Pipeline V2
│   │       │   │   ├── orchestrator.ts    # 파이프라인 오케스트레이터
│   │       │   │   ├── assemble.ts        # FFmpeg 병합
│   │       │   │   ├── grounding/         # Book Grounding
│   │       │   │   ├── style/             # Style Bible
│   │       │   │   └── planning/          # Scene Planning
│   │       │   ├── services/          # 외부 API 연동
│   │       │   │   ├── gemini-client.ts
│   │       │   │   ├── veo31-client.ts
│   │       │   │   ├── sora-client.ts
│   │       │   │   ├── backend-callback.service.ts
│   │       │   │   └── storage*.ts
│   │       │   ├── qc/                # 품질 검증
│   │       │   │   ├── safetyGate.ts
│   │       │   │   └── safetyKeywords.json
│   │       │   ├── worker.ts          # BullMQ Worker
│   │       │   └── index.ts
│   │       ├── storage/videos/        # 생성된 영상 저장
│   │       └── package.json
│   │
│   ├── docs/                          # 문서
│   │   ├── API.md                     # API 레퍼런스
│   │   ├── ERD.md                     # DB 스키마
│   │   ├── DEPLOYMENT.md              # 배포 가이드
│   │   └── ALPAS_데이터_정리.md
│   │
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── Dockerfile.worker
│   ├── docker-compose.yml
│   ├── nginx.conf
│   │
│   ├── README.md                      # 메인 문서
│   ├── QUICKSTART.md                  # 빠른 시작
│   ├── INDEX.md                       # 문서 인덱스
│   ├── DEVELOPMENT_GUIDE.md           # 개발 가이드
│   └── PROJECT_STRUCTURE.md           # 이 파일
│
├── 개발_기록.md                        # 개발 변경 이력
└── 아산도서관_개발_Final.md            # 기준 문서
```

## 핵심 디렉토리

### `/packages/backend`

Fastify 기반 API 서버

| 디렉토리/파일 | 설명 |
|--------------|------|
| `routes/` | API 라우트 정의 |
| `controllers/` | 요청 핸들러 |
| `services/` | 비즈니스 로직 (ALPAS 연동, 큐 관리 등) |
| `repositories/` | DB 접근 계층 |
| `prisma/` | Prisma 스키마 및 마이그레이션 |

### `/packages/frontend`

React + Vite 기반 SPA

| 디렉토리 | 설명 |
|---------|------|
| `pages/did/` | DID 키오스크 UI (480px 뷰포트) |
| `pages/admin/` | 관리자 대시보드 |
| `api/` | API 클라이언트 |
| `stores/` | Zustand 상태관리 |

### `/packages/worker`

BullMQ 기반 영상 생성 워커

| 디렉토리 | 설명 |
|---------|------|
| `pipeline/` | Pipeline V2 (grounding/style/planning/assemble) |
| `services/` | Gemini, Veo, Sora 클라이언트 |
| `qc/` | 품질 검증 (Safety Gate 등) |

## 기술 스택

### Backend
- **Framework**: Fastify 5
- **ORM**: Prisma (SQLite/PostgreSQL)
- **Queue**: BullMQ + Redis
- **Auth**: JWT

### Frontend
- **Framework**: React 18
- **Build**: Vite
- **State**: Zustand
- **Style**: TailwindCSS

### Worker
- **Queue**: BullMQ
- **AI**: Gemini 2.0 Flash, Veo 3.1, Sora
- **Video**: FFmpeg

## 데이터 흐름

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Frontend   │───▶│   Backend    │───▶│    Redis    │───▶│    Worker    │
│  (React)    │    │  (Fastify)   │    │   (BullMQ)  │    │ (Pipeline V2)│
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                          │                                       │
                          ▼                                       ▼
                   ┌──────────────┐                        ┌──────────────┐
                   │    SQLite    │◀───────────────────────│   Storage    │
                   │   (Prisma)   │      (Callback)        │  (Local/S3)  │
                   └──────────────┘                        └──────────────┘
```

## 주요 파일

| 파일 | 설명 |
|------|------|
| `backend/src/services/alpas-real.service.ts` | ALPAS 도서관 API 연동 |
| `backend/src/routes/did.routes.ts` | DID 공개 API |
| `worker/src/pipeline/orchestrator.ts` | Pipeline V2 오케스트레이터 |
| `worker/src/worker.ts` | BullMQ Worker 진입점 |
| `frontend/src/pages/did/DidV2BookDetail.tsx` | 책 상세 + 영상 재생 |

## 환경 설정

| 파일 | 설명 |
|------|------|
| `.env` | 환경 변수 (루트에 하나) |
| `prisma/schema.prisma` | DB 스키마 |
| `docker-compose.yml` | Docker 서비스 구성 |
| `nginx.conf` | Nginx 설정 (/METIS 경로) |
