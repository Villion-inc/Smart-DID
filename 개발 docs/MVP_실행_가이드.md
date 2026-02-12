# MVP 실행 가이드

## 전체 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│     Worker      │
│   (React)       │     │   (Express)     │     │   (BullMQ)      │
│   :5173         │     │   :3000         │     │                 │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │     SQLite      │     │   Gemini API    │
                        │   (Prisma)      │     │   Sora API      │
                        └─────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │     Redis       │
                        │   (BullMQ)      │
                        │   :6379         │
                        └─────────────────┘
```

---

## 1. 환경 변수 설정

`library-did-main/.env` 파일에 API 키 입력:

```env
# Gemini API (스크립트 생성)
GEMINI_API_KEY=AIzaSy...실제키입력

# Sora API (영상 생성)
OPENAI_API_KEY=sk-...실제키입력

# Redis (로컬에서 실행 중이면 기본값 사용)
REDIS_HOST=localhost
REDIS_PORT=6379

# 영상 파일 저장 경로 (Backend와 Worker가 같은 폴더를 써야 함)
# 예: 프로젝트 루트 기준 절대 경로 권장
STORAGE_PATH=./storage/videos
# 또는 절대경로: STORAGE_PATH=/Users/xxx/lib-mvp/library-did-main/storage/videos
```

---

## 2. 의존성 설치

```bash
cd library-did-main
npm install
```

---

## 3. 데이터베이스 초기화

```bash
cd packages/backend
npx prisma migrate dev
npx prisma db seed
```

---

## 4. Redis 실행

### 로컬 Redis가 없으면 Docker로 실행:

```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

---

## 5. 서비스 실행 (3개 터미널)

### 터미널 1: Backend

```bash
cd library-did-main/packages/backend
npm run dev
```

### 터미널 2: Worker

```bash
cd library-did-main/packages/worker
npm run dev
```

### 터미널 3: Frontend

```bash
cd library-did-main/packages/frontend
npm run dev
```

---

## 6. 접속

- **DID 화면**: http://localhost:5173/did
- **관리자**: http://localhost:5173/admin/login
  - ID: `admin`
  - PW: `changeme123`

---

## 영상 생성 흐름

1. **사용자가 테마 선택** → 도서 목록 표시
2. **도서 선택 후 "영상 보기"** 클릭
3. **Backend가 영상 상태 확인**:
   - `READY`: 바로 영상 URL 반환
   - `NONE/FAILED`: BullMQ 큐에 Job 추가
4. **Worker가 Job 처리**:
   - Book Grounding + Style Bible + Scene 계획 (Gemini)
   - 키프레임 생성 (Banana 또는 플레이스홀더)
   - **Sora(OPENAI_API_KEY) 또는 Veo** → 8초 영상 생성
   - 첫 씬 영상을 `STORAGE_PATH`에 저장 후 Backend 콜백으로 `/api/videos/xxx.mp4` 전달
5. **Backend**가 DB에 videoUrl 저장, **GET /api/videos/:filename**으로 파일 제공
6. **프론트엔드**가 폴링 후 영상 준비되면 재생

---

## API 엔드포인트 요약

| 용도 | Method | Endpoint |
|------|--------|----------|
| 테마별 도서 | GET | `/api/did/age/:group` |
| 도서 상세 | GET | `/api/did/books/:bookId` |
| 영상 상태 | GET | `/api/did/books/:bookId/video` |
| 영상 요청 | POST | `/api/did/books/:bookId/video/request` |
| AI 추천 | POST | `/api/recommendations/ai` |

---

## 트러블슈팅

### Redis 연결 실패

```bash
# Redis 실행 확인
redis-cli ping
# 응답: PONG
```

### Worker가 Job을 처리하지 않음

1. Redis 연결 확인
2. `.env`의 `BACKEND_URL` 확인 (기본: `http://localhost:3000`)
3. Worker 로그 확인

### 영상 생성 실패

1. Gemini API Key 확인
2. Sora/OpenAI API Key 확인
3. Worker 로그에서 에러 메시지 확인
