# Changelog

모든 주요 변경사항을 기록합니다.

## [2026-03-03] - PostgreSQL + pg-boss 마이그레이션

### 변경사항

#### 데이터베이스 마이그레이션 (SQLite → PostgreSQL)

- **Prisma provider 변경**: `sqlite` → `postgresql`
- **Cloud SQL 연결**: GCP Cloud SQL PostgreSQL 인스턴스 사용
- **Cloud SQL Connector**: Public IP 대신 Unix 소켓 연결 (보안 강화)
- **DATABASE_URL 형식**: 
  ```
  postgresql://USER:PASSWORD@localhost/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE
  ```

#### 큐 시스템 변경 (BullMQ + Redis → pg-boss)

- **Redis 제거**: 별도 Redis 인프라 불필요
- **pg-boss 도입**: PostgreSQL 기반 작업 큐
  - 비용 절감 (Redis 인스턴스 비용 없음)
  - 인프라 단순화 (PostgreSQL만 관리)
  - 트랜잭션 보장

**변경된 파일:**
- `packages/backend/src/services/queue.service.ts` - pg-boss로 전환
- `packages/backend/src/index.ts` - queueService 초기화 추가
- `packages/worker/src/worker.ts` - pg-boss Worker 구현
- `packages/worker/src/config/index.ts` - databaseUrl 설정 추가

#### UI 개선

- **Admin 페이지 9:16 비율 적용**: DID 키오스크와 동일한 화면 비율
  - `AdminLayout.tsx` - 9:16 aspect ratio 적용
  - `Login.tsx` - 9:16 aspect ratio 적용

#### 네이버 책 검색 API

- **타입 오류 수정**: `naver-book.service.ts`에서 response.json() 타입 캐스팅

### 새로운 파일

- `deploy-gcp.sh` - GCP Cloud Run 배포 자동화 스크립트
- `docs/CHANGELOG.md` - 변경 이력 문서

### 의존성 변경

**Backend:**
```diff
- "bullmq": "^4.x"
+ "pg-boss": "^10.x"
```

**Worker:**
```diff
- "bullmq": "^4.x"
+ "pg-boss": "^10.x"
```

### 환경 변수 변경

| 변수 | 변경 전 | 변경 후 |
|------|---------|---------|
| `DATABASE_URL` | `file:./dev.db` (SQLite) | `postgresql://...` (Cloud SQL) |
| `REDIS_HOST` | 필수 | **제거됨** |
| `REDIS_PORT` | 필수 | **제거됨** |
| `REDIS_PASSWORD` | 필수 | **제거됨** |

### 마이그레이션 가이드

1. **PostgreSQL 설정**
   ```bash
   # Cloud SQL 인스턴스 생성 또는 로컬 Docker
   docker run -d --name postgres \
     -e POSTGRES_USER=smartdid \
     -e POSTGRES_PASSWORD=smartdid123 \
     -e POSTGRES_DB=smart_did \
     -p 5432:5432 postgres:15-alpine
   ```

2. **DATABASE_URL 업데이트**
   ```env
   DATABASE_URL=postgresql://smartdid:smartdid123@localhost:5432/smart_did
   ```

3. **Prisma 마이그레이션**
   ```bash
   cd packages/backend
   npx prisma migrate deploy
   npx prisma generate
   ```

4. **Redis 환경변수 제거**
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` 제거

5. **의존성 업데이트**
   ```bash
   npm install
   ```

---

## [2026-02-28] - 초기 릴리스

### 기능

- DID 키오스크 화면 (9:16 비율)
- 관리자 페이지
- AI 영상 생성 파이프라인 (Gemini + Sora/Veo)
- 네이버 책 검색 API 연동
- ALPAS 도서관 API 연동
- 베스트셀러/신간 자동 수집

### 기술 스택

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Fastify + Prisma + SQLite
- **Worker**: BullMQ + Redis + FFmpeg
- **AI**: Gemini (스크립트), Sora/Veo (영상)
