# Deployment Guide

> **마지막 업데이트**: 2026-03-03

Smart DID Video Service 배포 가이드입니다.

## 목차

- [아키텍처 개요](#아키텍처-개요)
- [GCP Cloud Run 배포](#gcp-cloud-run-배포)
- [환경 변수](#환경-변수)
- [Docker 로컬 배포](#docker-로컬-배포)
- [모니터링](#모니터링)
- [트러블슈팅](#트러블슈팅)

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        GCP Cloud Run                             │
├─────────────────┬─────────────────┬─────────────────────────────┤
│    Frontend     │    Backend      │         Worker              │
│   (Nginx/SPA)   │  (Fastify API)  │   (pg-boss + Pipeline)      │
│                 │                 │                             │
│  - DID 화면     │  - REST API     │  - 영상 생성 (Sora/Veo)     │
│  - Admin 화면   │  - pg-boss 큐   │  - FFmpeg 조립              │
│                 │  - Prisma ORM   │  - GCS 업로드               │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                       │
         │                 ▼                       │
         │    ┌────────────────────────┐           │
         │    │   Cloud SQL (PostgreSQL)│◄──────────┘
         │    │   - 사용자/영상 데이터   │
         │    │   - pg-boss 큐 테이블   │
         │    └────────────────────────┘
         │
         ▼
┌────────────────────────┐
│  Cloud Storage (GCS)   │
│  - 생성된 영상 파일     │
│  - 자막 파일 (.vtt)    │
└────────────────────────┘
```

### 주요 변경사항 (2026-03-03)

- **Redis → pg-boss**: BullMQ + Redis 대신 PostgreSQL 기반 pg-boss 사용
- **SQLite → PostgreSQL**: Cloud SQL PostgreSQL로 전환
- **Cloud SQL Connector**: Public IP 대신 Unix 소켓 연결 (보안 강화)

## GCP Cloud Run 배포

### 사전 요구사항

1. GCP 프로젝트 (`asanlibrary`)
2. Cloud SQL PostgreSQL 인스턴스
3. Cloud Storage 버킷 (`smart-did-storage-1`)
4. Artifact Registry 저장소

### 1. Cloud SQL 설정

```bash
# Cloud SQL 인스턴스 생성 (이미 완료된 경우 스킵)
gcloud sql instances create smart-did-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-northeast3

# 데이터베이스 생성
gcloud sql databases create smart_did --instance=smart-did-db

# 사용자 비밀번호 설정
gcloud sql users set-password postgres \
  --instance=smart-did-db \
  --password=YOUR_PASSWORD
```

### 2. Docker 이미지 빌드 & 푸시

```bash
cd library-did-main

# Artifact Registry 인증
gcloud auth configure-docker asia-northeast3-docker.pkg.dev

# Backend 빌드 & 푸시
docker build -f Dockerfile.backend -t asia-northeast3-docker.pkg.dev/asanlibrary/smart-did/backend:latest .
docker push asia-northeast3-docker.pkg.dev/asanlibrary/smart-did/backend:latest

# Frontend 빌드 & 푸시
docker build -f Dockerfile.frontend \
  --build-arg VITE_API_URL=https://YOUR_BACKEND_URL/api \
  -t asia-northeast3-docker.pkg.dev/asanlibrary/smart-did/frontend:latest .
docker push asia-northeast3-docker.pkg.dev/asanlibrary/smart-did/frontend:latest

# Worker 빌드 & 푸시
docker build -f Dockerfile.worker -t asia-northeast3-docker.pkg.dev/asanlibrary/smart-did/worker:latest .
docker push asia-northeast3-docker.pkg.dev/asanlibrary/smart-did/worker:latest
```

### 3. Cloud Run 배포

#### Backend

```bash
gcloud run deploy smart-did-backend \
  --image asia-northeast3-docker.pkg.dev/asanlibrary/smart-did/backend:latest \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances asanlibrary:asia-northeast3:smart-did-db \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3
```

#### Frontend

```bash
gcloud run deploy smart-did-frontend \
  --image asia-northeast3-docker.pkg.dev/asanlibrary/smart-did/frontend:latest \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3
```

#### Worker

```bash
gcloud run deploy smart-did-worker \
  --image asia-northeast3-docker.pkg.dev/asanlibrary/smart-did/worker:latest \
  --region asia-northeast3 \
  --platform managed \
  --no-allow-unauthenticated \
  --add-cloudsql-instances asanlibrary:asia-northeast3:smart-did-db \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 2 \
  --no-cpu-throttling
```

### 4. 환경변수 설정 (GCP Console)

Cloud Run 서비스 → 수정 → 변수 및 보안 비밀 → 환경 변수 추가

## 환경 변수

### Backend

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NODE_ENV` | 환경 | `production` |
| `PORT` | 포트 | `3000` |
| `DATABASE_URL` | Cloud SQL 연결 | `postgresql://postgres:PASSWORD@localhost/smart_did?host=/cloudsql/asanlibrary:asia-northeast3:smart-did-db` |
| `JWT_SECRET` | JWT 시크릿 | `openssl rand -base64 32` |
| `INTERNAL_API_SECRET` | 내부 API 시크릿 | `openssl rand -base64 32` |
| `STORAGE_TYPE` | 저장소 타입 | `gcs` |
| `GCS_BUCKET` | GCS 버킷명 | `smart-did-storage-1` |
| `NAVER_CLIENT_ID` | 네이버 API ID | - |
| `NAVER_CLIENT_SECRET` | 네이버 API Secret | - |
| `ADMIN_USERNAME` | 관리자 ID | `admin` |
| `ADMIN_PASSWORD` | 관리자 비밀번호 | - |

### Worker

Backend 환경변수 + 추가:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `GEMINI_API_KEY` | Gemini API 키 | - |
| `OPENAI_API_KEY` | OpenAI (Sora) API 키 | - |
| `BACKEND_URL` | Backend URL | `https://smart-did-backend-xxx.run.app` |
| `WORKER_CONCURRENCY` | 동시 처리 수 | `2` |

### Frontend

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VITE_API_URL` | Backend API URL | `https://smart-did-backend-xxx.run.app/api` |

### Cloud SQL 연결 URL 형식

```
# Cloud Run에서 Cloud SQL Connector 사용 시 (권장)
DATABASE_URL=postgresql://USER:PASSWORD@localhost/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE

# 예시
DATABASE_URL=postgresql://postgres:mypassword@localhost/smart_did?host=/cloudsql/asanlibrary:asia-northeast3:smart-did-db
```

## Docker 로컬 배포

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: smartdid
      POSTGRES_PASSWORD: smartdid123
      POSTGRES_DB: smart_did
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    restart: always
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://smartdid:smartdid123@postgres:5432/smart_did
      - JWT_SECRET=${JWT_SECRET}
      - INTERNAL_API_SECRET=${INTERNAL_API_SECRET}
      - STORAGE_TYPE=local
      - NAVER_CLIENT_ID=${NAVER_CLIENT_ID}
      - NAVER_CLIENT_SECRET=${NAVER_CLIENT_SECRET}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    depends_on:
      - postgres
    volumes:
      - ./storage:/app/storage

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    restart: always
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://smartdid:smartdid123@postgres:5432/smart_did
      - INTERNAL_API_SECRET=${INTERNAL_API_SECRET}
      - BACKEND_URL=http://backend:3000
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - STORAGE_TYPE=local
      - WORKER_CONCURRENCY=2
    depends_on:
      - postgres
      - backend
    volumes:
      - ./storage:/app/storage

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        - VITE_API_URL=http://localhost:3001/api
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 실행

```bash
# 환경변수 설정
cp .env.example .env
# .env 파일 편집

# 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

## 모니터링

### 헬스 체크

```bash
# Backend
curl https://YOUR_BACKEND_URL/api/health

# 응답 예시
{"status":"ok","timestamp":"2026-03-03T12:00:00.000Z"}
```

### Cloud Run 로그

```bash
# Backend 로그
gcloud run services logs read smart-did-backend --region asia-northeast3

# Worker 로그
gcloud run services logs read smart-did-worker --region asia-northeast3
```

### 큐 상태 확인

```bash
curl -H "Authorization: Bearer <token>" \
  https://YOUR_BACKEND_URL/api/admin/queue/status
```

## 트러블슈팅

### Cloud SQL 연결 실패

1. Cloud Run 서비스에 Cloud SQL 연결이 추가되었는지 확인
2. DATABASE_URL 형식 확인 (`?host=/cloudsql/...`)
3. Cloud SQL Admin API 활성화 확인

### pg-boss 큐 오류

```
Error: Queue video-generation does not exist
```

→ 서비스 시작 시 `createQueue()`가 호출되는지 확인. Backend/Worker 모두 큐를 자동 생성함.

### Worker 콜백 실패

1. `INTERNAL_API_SECRET`이 Backend와 Worker에서 동일한지 확인
2. `BACKEND_URL`이 Worker에서 접근 가능한지 확인

### 영상 생성 실패

1. Worker 로그에서 오류 메시지 확인
2. API 키 (GEMINI, OPENAI) 유효성 확인
3. GCS 버킷 권한 확인

### 네이버 API 오류

1. `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 설정 확인
2. 네이버 개발자 센터에서 API 사용량 확인

## 배포 체크리스트

- [ ] Cloud SQL 인스턴스 생성 및 DB/유저 설정
- [ ] GCS 버킷 생성 및 권한 설정
- [ ] 환경 변수 설정 (JWT_SECRET, INTERNAL_API_SECRET 등)
- [ ] Docker 이미지 빌드 및 푸시
- [ ] Cloud Run 서비스 배포 (Backend → Frontend → Worker)
- [ ] Cloud SQL 연결 추가 (Backend, Worker)
- [ ] 헬스 체크 확인
- [ ] Admin 로그인 테스트
- [ ] 영상 생성 테스트
