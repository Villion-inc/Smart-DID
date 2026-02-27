# Smart DID Video Service - 문서 인덱스

> **마지막 업데이트**: 2026-02-28

프로젝트 문서 빠른 참조 가이드입니다.

## 처음 오셨나요? (Start Here!)

1. **[README.md](./README.md)** - 프로젝트 개요, 기술 스택, 구조
2. **[QUICKSTART.md](./QUICKSTART.md)** - 5분 안에 실행하기
3. **[docs/API.md](./docs/API.md)** - API 레퍼런스

## 문서 목록

### 프로젝트 이해

| 문서 | 설명 |
|------|------|
| [README.md](./README.md) | 프로젝트 개요, 기술 스택, 구조 |
| [QUICKSTART.md](./QUICKSTART.md) | 5분 빠른 시작 가이드 |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | 상세 파일 구조 |
| [개발_기록.md](../개발_기록.md) | 개발 변경 이력 (작업 1~25) |

### API & 데이터베이스

| 문서 | 설명 |
|------|------|
| [docs/API.md](./docs/API.md) | **전체 API 레퍼런스** (DID, Admin, Internal) |
| [docs/ERD.md](./docs/ERD.md) | 데이터베이스 스키마 |
| [docs/ALPAS_데이터_정리.md](./docs/ALPAS_데이터_정리.md) | ALPAS API 연동 정보 |

### 개발 & 배포

| 문서 | 설명 |
|------|------|
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | 개발 워크플로우, 코드 스타일 |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | 배포 가이드 (Docker, 도서관 서버) |

## 역할별 가이드

### 신규 개발자

1. [README.md](./README.md) - 프로젝트 이해
2. [QUICKSTART.md](./QUICKSTART.md) - 로컬 실행
3. [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 개발 시작

### API 연동 개발자

1. [docs/API.md](./docs/API.md) - API 레퍼런스
2. [docs/ERD.md](./docs/ERD.md) - 데이터 구조

### DevOps / 배포 담당자

1. [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - 배포 가이드
2. [README.md](./README.md) - 환경 변수 설정

## 주요 코드 위치

### Frontend (React)

```
packages/frontend/src/
├── pages/did/           # DID 키오스크 UI
│   ├── DidV2Home.tsx    # 메인 화면
│   ├── DidV2BookDetail.tsx  # 책 상세 + 영상 재생
│   └── DidV2Location.tsx    # 위치 안내
├── pages/admin/         # 관리자 대시보드
└── api/                 # API 클라이언트
```

### Backend (Fastify)

```
packages/backend/src/
├── routes/              # API 라우트 정의
│   ├── did.routes.ts    # DID 공개 API
│   ├── admin.routes.ts  # 관리자 API
│   └── internal.routes.ts   # Worker 콜백
├── controllers/         # 요청 처리
├── services/            # 비즈니스 로직
│   └── alpas-real.service.ts  # ALPAS 연동
└── repositories/        # 데이터 접근
```

### Worker (영상 생성)

```
packages/worker/src/
├── pipeline/            # Pipeline V2
│   ├── orchestrator.ts  # 파이프라인 오케스트레이터
│   ├── grounding/       # 책 정보 수집
│   ├── style/           # 스타일 결정
│   └── planning/        # 장면 계획
├── services/            # 외부 API 연동
│   ├── gemini-client.ts # Gemini API
│   └── veo31-client.ts  # Veo 3.1 API
└── qc/                  # 품질 검증
```

## 빠른 명령어

```bash
# 설치
npm install

# 개발 서버 (전체)
npm run dev

# 개별 실행
npm run dev:backend
npm run dev:frontend
npm run dev:worker

# 빌드
npm run build

# 테스트
npm test

# DB 마이그레이션
cd packages/backend && npm run prisma:migrate:deploy
```

## 환경 변수 요약

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` | Prisma DB 연결 |
| `JWT_SECRET` | 관리자 인증 |
| `INTERNAL_API_SECRET` | Worker↔Backend 통신 |
| `REDIS_HOST/PORT` | BullMQ 큐 |
| `BACKEND_URL` | Worker 콜백 대상 |
| `GEMINI_API_KEY` | 텍스트 생성 |
| `OPENAI_API_KEY` | Sora 영상 생성 |
| `VEO_API_KEY` | Veo 영상 생성 |

## FAQ

**Q: 프로젝트를 처음 받았는데 어디서부터 봐야 하나요?**  
A: [QUICKSTART.md](./QUICKSTART.md) → [README.md](./README.md) → [docs/API.md](./docs/API.md)

**Q: API 엔드포인트는 어디서 확인하나요?**  
A: [docs/API.md](./docs/API.md) 또는 http://localhost:3001/documentation (Swagger)

**Q: 영상 생성은 어떻게 동작하나요?**  
A: [README.md](./README.md)의 "영상 생성 흐름" 섹션 참고

**Q: 배포는 어떻게 하나요?**  
A: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) 참고

**Q: 최근 변경 사항은?**  
A: [개발_기록.md](../개발_기록.md) 참고

## 연락처

- 프로젝트: GenTA / Villion Inc.
