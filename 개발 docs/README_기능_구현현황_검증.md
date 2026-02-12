# 꿈샘 도서관 Smart DID — README 기능 구현 현황 검증

README에 명시된 기능이 **현재 코드베이스에서 구현 가능한 상태인지** 검증한 결과입니다.

---

## 요약

| 구분 | 상태 |
|------|------|
| **대부분** | ✅ **구현됨** — README와 일치하며 동작 가능 |
| **일부** | ⚠️ **보완 필요** — 로직은 있으나 버그/경로 수정 필요 |
| **환경/외부** | 📌 **확인 필요** — ALPAS API Key, Veo API, Redis 등 실제 연동 시 설정 필요 |

**결론: README에 적힌 기능은 현재 개발 상태에서 대부분 구현 가능합니다.**  
다만 아래 “보완 필요” 항목 2가지를 수정하면, 문서대로 완전히 동작합니다.

---

## 1. 핵심 기능 — 구현 여부

### 1.1 영상 자동 생성 시스템

| 기능 | 상태 | 비고 |
|------|------|------|
| 베스트셀러 100권 사전 생성 | ✅ | `POST /api/admin/seed/bestsellers?limit=100`, `bestseller-seed.service` |
| 실시간 요청 처리 (사용자 요청 → 큐) | ✅ | `POST /api/did/books/:bookId/video/request` → `queueService.addUserRequest` |
| 중복 방지 (QUEUED/GENERATING/READY 시 재생성 안 함) | ✅ | `queue.service.addVideoJob` 내부에서 상태 체크 후 스킵 |

### 1.2 스마트 캐시 관리 (LRU)

| 기능 | 상태 | 비고 |
|------|------|------|
| 자동 삭제 (오래된 것부터) | ✅ | `cache-manager.service` — 만료 → 최대 개수 초과(LRU) → 미사용 순 |
| 랭킹 시스템 (조회수 + 최근성) | ✅ | `video.service` / `cache-manager` — `rankingScore = requestCount + recencyBoost` |
| 최대 500개, 초과 시 LRU 정리 | ✅ | `MAX_CACHED_VIDEOS=500`, `getStaleVideos` 등 |

### 1.3 우선순위 기반 큐

| 우선순위 | 대상 | 상태 | 코드 |
|----------|------|------|------|
| 1 | 관리자 요청 | ✅ | `queueService.addAdminRequest` → priority 1 |
| 5 | 사용자 요청 | ✅ | `queueService.addUserRequest` → priority 5 |
| 20 | 베스트셀러 시드 | ✅ | `queueService.seedBestsellers` → priority 20 |

---

## 2. API 엔드포인트 — 구현 여부

### DID 공개 API (`/api/did`)

| Method | Endpoint | 구현 |
|--------|----------|------|
| GET | `/did/new-arrivals` | ✅ `did.controller.getNewArrivals` |
| GET | `/did/librarian-picks` | ✅ `did.controller.getLibrarianPicks` |
| GET | `/did/age/:group` | ✅ `did.controller.getBooksByAge` (preschool/elementary/teen) |
| GET | `/did/search?q=keyword` | ✅ `did.controller.searchBooks` (영상 상태 포함) |
| GET | `/did/books/:bookId` | ✅ `did.controller.getBookDetail` |
| GET | `/did/books/:bookId/video` | ✅ `did.controller.getVideoStatus` |
| POST | `/did/books/:bookId/video/request` | ✅ `did.controller.requestVideo` (큐 추가) |
| GET | `/did/videos/popular` | ✅ `did.controller.getPopularVideos` |

### 관리자 API (`/api/admin`) — 인증 필요

| Method | Endpoint | 구현 |
|--------|----------|------|
| GET | `/admin/dashboard/stats` | ✅ |
| POST | `/admin/seed/bestsellers?limit=100` | ✅ |
| POST | `/admin/seed/age-group/:ageGroup` | ✅ |
| GET | `/admin/seed/status` | ✅ |
| GET | `/admin/queue/stats` | ✅ |
| GET | `/admin/queue/waiting` | ✅ |
| DELETE | `/admin/queue/:bookId` | ✅ |
| POST | `/admin/queue/:bookId/retry` | ⚠️ 아래 “보완 필요” 참고 |
| GET | `/admin/cache/stats` | ✅ |
| POST | `/admin/cache/cleanup` | ✅ |

---

## 3. 데이터 모델·비즈니스 로직

- **VideoRecord**: README와 동일 (status, requestCount, lastRequestedAt, retryCount, rankingScore, expiresAt, videoUrl, errorMessage). `subtitleUrl` 필드가 스키마에 추가되어 있음.
- **영상 상태 흐름**: NONE → QUEUED → GENERATING → READY / FAILED 구현됨 (worker 콜백으로 갱신).
- **랭킹 점수**: `rankingScore = requestCount + recencyBoost`, 7일 이내 recency 반영 — README 공식과 일치.
- **LRU 정리 규칙**: 만료 → 500개 초과 시 낮은 점수부터 삭제 → 30일 미사용 + requestCount < 3 삭제 — README와 일치.

---

## 4. 프론트엔드·워커

- **페이지**: Home, SearchPage, BookDetailPage, did/DidHome, DidBookDetail, admin/AdminDashboard, VideoManagement 등 README 구조와 일치.
- **DID API 클라이언트**: `did.api.ts`에서 위 DID 엔드포인트 모두 호출.
- **워커**: BullMQ Worker → Pipeline V2 (orchestrator) → Veo3.1 클라이언트 → 완료 시 `/internal/video-callback` 호출로 VideoRecord 갱신.

---

## 5. ⚠️ 보완 필요 (2건)

### 5.1 관리자 “영상 생성 요청” 시 큐 미추가

- **현상**: `POST /api/admin/books/:bookId/video` → `admin.controller.requestVideoGeneration` → `videoService.requestVideo(bookId, true)` 만 호출.
- **문제**: `video.service.requestVideo`는 DB만 QUEUED로 바꾸고 **BullMQ에 job을 추가하지 않음**. 따라서 관리자가 한 권씩 “영상 생성 요청”해도 워커가 처리하지 않음.
- **권장**: 관리자 단건 요청도 큐에 넣도록, `requestVideoGeneration`에서 `videoService.requestVideo` 후 `queueService.addAdminRequest(book)` 호출하거나, `video.service.requestVideo` 내부에서 QUEUED로 바꾼 뒤 `queueService`에 job 추가하도록 수정.

### 5.2 실패 작업 “재시도” 시 큐 미재추가

- **현상**: `POST /api/admin/queue/:bookId/retry` → `queueService.retryFailedJob(bookId)`.
- **문제**: `retryFailedJob`은 DB만 FAILED → QUEUED로 업데이트하고 **BullMQ에 새 job을 추가하지 않음**. 따라서 “재시도”해도 워커가 해당 책을 다시 처리하지 않음.
- **권장**: FAILED인 책에 대해 `queueService.retryFailedJob`에서 DB 업데이트 후, 해당 책 정보로 `addVideoJob`(또는 `addAdminRequest`)를 호출해 큐에 다시 넣기.

---

## 6. 📌 확인 필요 (환경·외부 연동)

- **ALPAS API**: 코드상 `alpas.service.ts`(실제 API) 사용. 도메인/키/테스트 환경(예: alpas.kr, Network Adapter ID 등) 확인 필요.
- **Veo 3.1 API**: `veo31-client.ts`에서 Google AI Platform 엔드포인트 호출. API Key, projectId, location 설정 필요.
- **Redis**: BullMQ용. `REDIS_HOST`, `REDIS_PORT` 등 설정 필요.
- **Storage**: 로컬 또는 S3. `STORAGE_TYPE`, `STORAGE_PATH` 또는 S3 설정 필요.
- **Worker ↔ Backend 콜백**: `INTERNAL_API_SECRET`, 백엔드 URL 등 환경 변수로 worker가 `/internal/video-callback` 호출 가능한지 확인.

---

## 7. 정리

- README에 적힌 **핵심 기능·API·데이터 모델·LRU·우선순위 큐**는 현재 코드베이스에서 **구현 가능한 상태**입니다.
- **반드시 고칠 부분**: 관리자 단건 영상 요청 시 큐 추가, 실패 재시도 시 큐 재추가 — 위 2가지만 보완하면 README 명세와 동작이 일치합니다.
- 실제 서비스 운영을 위해서는 ALPAS, Veo, Redis, Storage, 내부 콜백 URL/시크릿 등 **환경 설정 확인**이 필요합니다.
