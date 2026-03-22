# Smart DID - 꿈샘 도서관 AI 영상 서비스

> **마지막 업데이트**: 2026-02-28

아산 꿈샘 아동청소년 도서관을 위한 AI 기반 도서 소개 영상 자동 생성 서비스입니다.

## 핵심 기능

- **DID 키오스크 UI**: 신착/추천 도서 표시, 검색, AI 영상 재생, 위치 안내
- **영상 자동 생성**: Gemini + Veo/Sora 기반 Pipeline V2
- **관리자 대시보드**: 영상 생성 현황, 큐 관리, 캐시 관리

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
├── library-did-main/          # 메인 서비스
│   ├── packages/
│   │   ├── frontend/          # React SPA (DID + 관리자)
│   │   ├── backend/           # Fastify API Server
│   │   ├── worker/            # 영상 생성 워커
│   │   └── shared/            # 공유 타입
│   └── docs/                  # 문서 (API, ERD, 배포)
│
├── genta_video_engine/        # 독립 영상 생성 엔진 (참조용)
│
├── 개발_기록.md                # 개발 변경 이력
└── 아산도서관_개발_Final.md    # 기준 문서
```

## 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일 편집 (API 키 등)

# 3. DB 초기화
cd library-did-main/packages/backend
npm run prisma:migrate:deploy
npm run prisma:generate
cd ../../..

# 4. Redis 실행
docker run -d -p 6379:6379 redis:alpine

# 5. 개발 서버 실행
cd library-did-main
npm run dev
```

### 접속 URL

| 서비스 | URL |
|--------|-----|
| DID 메인 | http://localhost:5173/did |
| 관리자 | http://localhost:5173/admin/login |
| API 문서 | http://localhost:3001/documentation |

## 영상 생성 파이프라인

```
1. Book Grounding    → 책 정보 수집
2. Style Bible       → 스타일 결정
3. Scene Planning    → 3장면 시나리오
4. Video Generation  → Veo/Sora 영상 생성
5. Subtitle Gen      → VTT 자막 생성
6. Assembly          → FFmpeg 병합 + 자막
7. Callback          → Backend 완료 알림
```

## 문서

| 문서 | 설명 |
|------|------|
| [library-did-main/README.md](./library-did-main/README.md) | 상세 프로젝트 문서 |
| [library-did-main/QUICKSTART.md](./library-did-main/QUICKSTART.md) | 5분 빠른 시작 |
| [library-did-main/docs/API.md](./library-did-main/docs/API.md) | API 레퍼런스 |
| [library-did-main/docs/ERD.md](./library-did-main/docs/ERD.md) | DB 스키마 |
| [library-did-main/docs/DEPLOYMENT.md](./library-did-main/docs/DEPLOYMENT.md) | 배포 가이드 |
| [개발_기록.md](./개발_기록.md) | 개발 변경 이력 |

## 환경 변수

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | Prisma DB 연결 |
| `REDIS_HOST/PORT` | BullMQ 큐 |
| `JWT_SECRET` | 관리자 인증 |
| `INTERNAL_API_SECRET` | Worker↔Backend 통신 |
| `GEMINI_API_KEY` | 텍스트 생성 |
| `OPENAI_API_KEY` | Sora 영상 생성 |
| `VEO_API_KEY` | Veo 영상 생성 |

## 라이선스

Private - GenTA / Villion Inc.
