# API Documentation

> **마지막 업데이트**: 2026-02-28  
> **Base URL**: `http://localhost:3001/api` (개발) 또는 `http://10.10.11.13/METIS/api` (운영)

## 목차

- [인증](#인증)
- [DID 공개 API](#did-공개-api)
- [Admin API](#admin-api-인증-필요)
- [Internal API](#internal-api-worker-전용)
- [Video 파일 서빙](#video-파일-서빙)
- [에러 응답](#에러-응답)
- [테스트 예제](#테스트-예제)

---

## 인증

### 로그인

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### 현재 사용자 정보

```http
GET /api/auth/me
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "username": "admin",
    "role": "admin"
  }
}
```

---

## DID 공개 API

> DID(Digital Information Display) 키오스크용 공개 API입니다.  
> 인증 없이 접근 가능합니다.

### 신착 도서 목록

```http
GET /api/did/new-arrivals
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bookId": "70007968",
      "title": "어린왕자",
      "author": "생텍쥐페리",
      "coverImageUrl": "https://...",
      "videoStatus": "READY"
    }
  ]
}
```

### 사서 추천 도서

```http
GET /api/did/librarian-picks
```

### 연령대별 추천 도서

```http
GET /api/did/age/:group
```

**Path Parameters:**
| 파라미터 | 설명 | 값 |
|---------|------|-----|
| `group` | 연령대 | `preschool` (유아), `elementary` (아동), `teen` (청소년) |

### 도서 검색

```http
GET /api/did/search?q={keyword}&limit={limit}
```

**Query Parameters:**
| 파라미터 | 필수 | 설명 | 기본값 |
|---------|------|------|--------|
| `q` | O | 검색 키워드 | - |
| `limit` | X | 최대 결과 수 | 20 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bookId": "70007968",
      "title": "어린왕자",
      "author": "생텍쥐페리",
      "publisher": "문학동네",
      "coverImageUrl": "https://...",
      "videoStatus": "READY"
    }
  ]
}
```

### 도서 상세 정보

```http
GET /api/did/books/:bookId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookId": "70007968",
    "title": "어린왕자",
    "author": "생텍쥐페리",
    "publisher": "문학동네",
    "publishedYear": "2020",
    "summary": "사막에 불시착한 비행사가 어린 왕자를 만나...",
    "category": "문학",
    "coverImageUrl": "https://...",
    "shelfCode": "A-01-05",
    "callNumber": "808.3-생833ㅇ",
    "isbn": "9788937460470",
    "isAvailable": true
  }
}
```

### 영상 상태 조회

```http
GET /api/did/books/:bookId/video
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "READY",
    "videoUrl": "/api/videos/70007968-1234567890.mp4",
    "subtitleUrl": "/api/videos/70007968-1234567890.vtt"
  }
}
```

**Status 값:**
| 상태 | 설명 |
|------|------|
| `NONE` | 영상 없음 |
| `QUEUED` | 생성 대기 중 |
| `GENERATING` | 생성 중 |
| `READY` | 영상 준비됨 |
| `FAILED` | 생성 실패 |

### 영상 생성 요청

```http
POST /api/did/books/:bookId/video/request
```

**Request Body (선택):**
```json
{
  "title": "어린왕자",
  "author": "생텍쥐페리",
  "summary": "사막에 불시착한 비행사가..."
}
```

> 책 정보를 함께 전달하면 캐시 미스 시에도 영상 생성이 가능합니다.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "QUEUED",
    "message": "영상 생성이 요청되었습니다"
  }
}
```

### 인기 영상 목록

```http
GET /api/did/videos/popular
```

---

## Admin API (인증 필요)

> 모든 Admin API는 JWT 토큰이 필요합니다.  
> Header: `Authorization: Bearer <JWT_TOKEN>`

### 대시보드 통계

```http
GET /api/admin/dashboard/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVideos": 150,
    "readyVideos": 120,
    "queuedVideos": 10,
    "failedVideos": 5,
    "totalCost": 125.50,
    "remainingBudget": 374.50
  }
}
```

### 신착 도서 (관리자용)

```http
GET /api/admin/recommendations/new-arrivals
```

### 사서 추천 도서 (관리자용)

```http
GET /api/admin/recommendations/librarian-picks
```

### 영상 생성 요청 (관리자)

```http
POST /api/admin/books/:bookId/video
```

> 관리자가 직접 영상 생성을 요청합니다. 높은 우선순위로 큐에 등록됩니다.

### 영상 목록 조회

```http
GET /api/admin/videos
```

**Query Parameters:**
| 파라미터 | 설명 |
|---------|------|
| `status` | 상태 필터 (NONE, QUEUED, GENERATING, READY, FAILED) |
| `limit` | 최대 결과 수 |
| `offset` | 페이지네이션 오프셋 |

### 영상 정보 수정

```http
PATCH /api/admin/books/:bookId/video
```

**Request Body:**
```json
{
  "expiresAt": "2026-06-01T00:00:00.000Z"
}
```

### 베스트셀러 시드

```http
POST /api/admin/seed/bestsellers
```

> 베스트셀러 도서들의 영상을 미리 생성합니다.

### 연령대별 시드

```http
POST /api/admin/seed/age-group/:ageGroup
```

**Path Parameters:**
| 파라미터 | 값 |
|---------|-----|
| `ageGroup` | `preschool`, `elementary`, `teen` |

### 시드 상태 조회

```http
GET /api/admin/seed/status
```

### 큐 통계

```http
GET /api/admin/queue/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3
  }
}
```

### 대기 작업 목록

```http
GET /api/admin/queue/waiting
```

### 작업 취소

```http
DELETE /api/admin/queue/:bookId
```

### 실패 작업 재시도

```http
POST /api/admin/queue/:bookId/retry
```

### 캐시 통계

```http
GET /api/admin/cache/stats
```

### 캐시 정리

```http
POST /api/admin/cache/cleanup
```

> LRU 기반으로 오래된 영상을 정리합니다.

### 알림 목록

```http
GET /api/admin/notifications
```

### 알림 읽음 처리

```http
PATCH /api/admin/notifications/:id/read
```

### 모든 알림 읽음 처리

```http
POST /api/admin/notifications/mark-all-read
```

---

## Internal API (Worker 전용)

> Worker에서 Backend로 영상 생성 결과를 전달하는 내부 API입니다.  
> Header: `X-Internal-Secret: <INTERNAL_API_SECRET>`

### 영상 생성 콜백

```http
POST /api/internal/video-callback
X-Internal-Secret: <INTERNAL_API_SECRET>
```

**Request Body:**
```json
{
  "bookId": "70007968",
  "status": "READY",
  "videoUrl": "/api/videos/70007968-1234567890.mp4",
  "subtitleUrl": "/api/videos/70007968-1234567890.vtt"
}
```

또는 실패 시:
```json
{
  "bookId": "70007968",
  "status": "FAILED",
  "errorMessage": "Video generation timeout"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookId": "70007968",
    "status": "READY"
  }
}
```

---

## Video 파일 서빙

### 영상/자막 파일 조회

```http
GET /api/videos/:filename
```

**예시:**
- 영상: `GET /api/videos/70007968-1234567890.mp4`
- 자막: `GET /api/videos/70007968-1234567890.vtt`

**Content-Type:**
| 확장자 | Content-Type |
|--------|--------------|
| `.mp4` | `video/mp4` |
| `.vtt` | `text/vtt` |

---

## 에러 응답

### 표준 에러 형식

```json
{
  "success": false,
  "error": "에러 메시지"
}
```

### HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| `200` | 성공 |
| `201` | 생성 성공 |
| `400` | 잘못된 요청 |
| `401` | 인증 필요/실패 |
| `403` | 권한 없음 |
| `404` | 리소스 없음 |
| `500` | 서버 에러 |

---

## 테스트 예제

### cURL

```bash
# 로그인
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# 도서 검색 (DID)
curl "http://localhost:3001/api/did/search?q=어린왕자&limit=5"

# 도서 상세 (DID)
curl http://localhost:3001/api/did/books/70007968

# 영상 상태 조회
curl http://localhost:3001/api/did/books/70007968/video

# 영상 생성 요청
curl -X POST http://localhost:3001/api/did/books/70007968/video/request \
  -H "Content-Type: application/json" \
  -d '{"title":"어린왕자","author":"생텍쥐페리"}'

# 관리자: 대시보드 통계
curl http://localhost:3001/api/admin/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# 관리자: 큐 상태
curl http://localhost:3001/api/admin/queue/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

// 로그인
const loginRes = await api.post('/auth/login', {
  username: 'admin',
  password: 'your-password',
});
const token = loginRes.data.data.token;

// 토큰 설정
api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// 도서 검색
const books = await api.get('/did/search', { params: { q: '어린왕자' } });

// 영상 생성 요청
const videoReq = await api.post('/did/books/70007968/video/request', {
  title: '어린왕자',
  author: '생텍쥐페리',
});

// 관리자: 큐 상태
const queueStats = await api.get('/admin/queue/stats');
```

---

## Swagger UI

서버 실행 후 Swagger UI에서 API 문서 확인:
- http://localhost:3001/documentation

---

## 관련 문서

- [README.md](../README.md) - 프로젝트 개요
- [개발_기록.md](../../개발_기록.md) - 개발 변경 이력
- [ERD.md](./ERD.md) - 데이터베이스 스키마
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 배포 가이드
