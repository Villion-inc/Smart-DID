# Development Guide

> **마지막 업데이트**: 2026-02-28

Smart DID Video Service 개발 가이드입니다.

## 개발 환경 설정

### 사전 요구사항

- Node.js 18+
- Redis
- FFmpeg (영상 병합용)
- Git

### 최초 설정

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 3. DB 초기화
cd packages/backend
npm run prisma:migrate:deploy
npm run prisma:generate
cd ../..

# 4. Redis 실행
docker run -d -p 6379:6379 redis:alpine

# 5. 개발 서버 실행
npm run dev
```

## 일상 개발

### 서비스 실행

```bash
# 전체 실행 (권장)
npm run dev

# 개별 실행
npm run dev:backend   # Backend (포트 3001)
npm run dev:frontend  # Frontend (포트 5173)
npm run dev:worker    # Worker
```

### 접속 URL

| 서비스 | URL |
|--------|-----|
| DID 메인 | http://localhost:5173/did |
| 관리자 | http://localhost:5173/admin/login |
| API 문서 | http://localhost:3001/documentation |

## 프로젝트 구조

```
packages/
├── shared/    # 공유 타입
├── backend/   # Fastify API
├── frontend/  # React SPA
└── worker/    # 영상 생성 워커
```

### 패키지 간 의존성

```json
{
  "dependencies": {
    "@smart-did/shared": "*"
  }
}
```

### 의존성 추가

```bash
# 특정 패키지에 추가
npm install axios --workspace=@smart-did/backend

# 루트에 추가 (dev)
npm install -D prettier
```

## Backend 개발

### API 엔드포인트 추가

1. **라우트 정의** (`routes/*.routes.ts`):

```typescript
fastify.get('/did/new-endpoint', controller.handler.bind(controller));
```

2. **컨트롤러 구현** (`controllers/*.controller.ts`):

```typescript
async handler(request: FastifyRequest, reply: FastifyReply) {
  const result = await this.service.doSomething();
  return reply.send({ success: true, data: result });
}
```

3. **서비스 로직** (`services/*.service.ts`):

```typescript
async doSomething(): Promise<SomeType> {
  // 비즈니스 로직
}
```

### DB 스키마 변경

```bash
cd packages/backend

# 스키마 수정 후
npm run prisma:migrate:deploy
npm run prisma:generate
```

## Frontend 개발

### 페이지 추가

1. **페이지 컴포넌트** (`pages/*.tsx`):

```tsx
export function NewPage() {
  return <div>New Page</div>;
}
```

2. **라우트 등록** (`App.tsx`):

```tsx
<Route path="/new-page" element={<NewPage />} />
```

### API 호출

```typescript
// api/*.api.ts
export async function fetchData(): Promise<DataType> {
  const response = await apiClient.get('/endpoint');
  return response.data.data;
}
```

### 상태 관리 (Zustand)

```typescript
// stores/*.ts
import { create } from 'zustand';

interface State {
  data: DataType | null;
  fetchData: () => Promise<void>;
}

export const useStore = create<State>((set) => ({
  data: null,
  fetchData: async () => {
    const data = await fetchData();
    set({ data });
  },
}));
```

## Worker 개발

### Pipeline V2 흐름

```
1. Book Grounding    → 책 정보 수집
2. Style Bible       → 스타일 결정
3. Scene Planning    → 장면 계획
4. Video Generation  → Veo/Sora 영상 생성
5. Subtitle Gen      → VTT 자막 생성
6. Assembly          → FFmpeg 병합
7. Storage & Callback → 저장 + Backend 콜백
```

### 새 서비스 추가

```typescript
// services/new-client.ts
export class NewClient {
  async doSomething(): Promise<Result> {
    // 구현
  }
}
```

## 코드 스타일

### TypeScript

- strict 모드 사용
- 명시적 반환 타입
- `any` 대신 `unknown` 사용

```typescript
// Good
async function getBook(id: string): Promise<Book> {
  // ...
}

// Bad
function getBook(id) {
  // ...
}
```

### 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일 | kebab-case | `book-detail.tsx` |
| 컴포넌트 | PascalCase | `BookDetail` |
| 함수 | camelCase | `getBookDetail` |
| 상수 | UPPER_SNAKE | `MAX_RETRIES` |

## 디버깅

### Backend 로그

```typescript
fastify.log.info('Processing request', { bookId });
fastify.log.error('Error occurred', { error: err.message });
```

### Worker 로그

```typescript
console.log('[Worker] Processing job', { jobId, bookId });
```

### 환경 변수 확인

Worker 기동 시 키 로드 상태가 로그에 출력됩니다:
```
GEMINI_API_KEY: set
OPENAI_API_KEY: NOT SET
VEO_API_KEY: set
```

## 테스트

```bash
# 전체 테스트
npm test

# 특정 패키지
npm test --workspace=@smart-did/backend

# Watch 모드
npm test -- --watch
```

## 트러블슈팅

### "@smart-did/shared" 모듈 못 찾음

```bash
npm run build --workspace=@smart-did/shared
```

### Redis 연결 실패

```bash
# Redis 상태 확인
redis-cli ping

# Redis 시작
docker run -d -p 6379:6379 redis:alpine
```

### Prisma 오류

```bash
cd packages/backend
npm run prisma:generate
```

### Worker 콜백 401

Backend와 Worker의 `INTERNAL_API_SECRET` 값이 동일한지 확인

## 관련 문서

- [README.md](./README.md) - 프로젝트 개요
- [QUICKSTART.md](./QUICKSTART.md) - 빠른 시작
- [docs/API.md](./docs/API.md) - API 레퍼런스
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - 파일 구조
