# Deployment Guide

> **마지막 업데이트**: 2026-02-28

Smart DID Video Service 배포 가이드입니다.

## 목차

- [환경 설정](#환경-설정)
- [Docker 배포](#docker-배포)
- [수동 배포](#수동-배포)
- [Nginx 설정](#nginx-설정)
- [모니터링](#모니터링)
- [보안](#보안)
- [백업](#백업)

## 환경 설정

### 필수 인프라

- **서버**: 2+ CPU, 4GB+ RAM
- **Redis**: 큐 관리용
- **FFmpeg**: 영상 병합용
- **SSL 인증서**: HTTPS용

### 환경 변수

`.env.production` 파일 생성:

```env
# Environment
NODE_ENV=production

# Backend
PORT=3001
API_PREFIX=/api

# Database (SQLite 또는 PostgreSQL)
DATABASE_URL=file:./prod.db
# DATABASE_URL=postgresql://user:password@localhost:5432/smart_did

# JWT
JWT_SECRET=<64자-이상-랜덤-문자열>
JWT_EXPIRES_IN=3600

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# Internal API (Backend-Worker 통신)
INTERNAL_API_SECRET=<internal-secret>
BACKEND_URL=http://localhost:3001

# AI APIs
GEMINI_API_KEY=<gemini-api-key>
VEO_API_KEY=<veo-api-key>
OPENAI_API_KEY=<openai-api-key>

# ALPAS (도서관 API)
ALPAS_API_URL=https://alpas.library.example.com/api
ALPAS_API_KEY=<alpas-api-key>

# Video Settings
VIDEO_DEFAULT_EXPIRY_DAYS=90
VIDEO_MAX_RETRIES=3

# Worker
WORKER_CONCURRENCY=2

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-password>
```

### 시크릿 생성

```bash
# JWT 시크릿
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Internal API 시크릿
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Docker 배포

### 사전 요구사항

- Docker 20.10+
- Docker Compose 2.0+

### 이미지 빌드

```bash
cd library-did-main

# 전체 빌드
docker-compose build

# 개별 빌드
docker build -f Dockerfile.backend -t smart-did-backend .
docker build -f Dockerfile.frontend -t smart-did-frontend .
docker build -f Dockerfile.worker -t smart-did-worker .
```

### Docker Compose 실행

```bash
# 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 상태 확인
docker-compose ps

# 서비스 중지
docker-compose down
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    restart: always
    ports:
      - "3001:3001"
    env_file: .env.production
    depends_on:
      - redis
    volumes:
      - ./packages/worker/storage:/app/packages/worker/storage

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    restart: always
    env_file: .env.production
    depends_on:
      - redis
      - backend
    volumes:
      - ./packages/worker/storage:/app/packages/worker/storage

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  redis_data:
```

## 수동 배포

### 1. 서버 준비

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 18 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Redis 설치
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# FFmpeg 설치
sudo apt install -y ffmpeg

# Nginx 설치
sudo apt install -y nginx
```

### 2. 빌드

```bash
# 저장소 클론
git clone https://github.com/your-org/smart-did.git
cd smart-did/library-did-main

# 의존성 설치
npm install

# 빌드
npm run build
```

### 3. Systemd 서비스

**Backend** (`/etc/systemd/system/smart-did-backend.service`):

```ini
[Unit]
Description=Smart DID Backend API
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/smart-did/library-did-main/packages/backend
EnvironmentFile=/var/www/smart-did/.env.production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Worker** (`/etc/systemd/system/smart-did-worker.service`):

```ini
[Unit]
Description=Smart DID Video Worker
After=network.target redis.service smart-did-backend.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/smart-did/library-did-main/packages/worker
EnvironmentFile=/var/www/smart-did/.env.production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

서비스 활성화:

```bash
sudo systemctl enable smart-did-backend smart-did-worker
sudo systemctl start smart-did-backend smart-did-worker
sudo systemctl status smart-did-backend smart-did-worker
```

## Nginx 설정

`/etc/nginx/sites-available/smart-did`:

```nginx
upstream backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name library.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name library.example.com;

    ssl_certificate /etc/letsencrypt/live/library.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/library.example.com/privkey.pem;

    # Frontend (정적 파일)
    root /var/www/smart-did/library-did-main/packages/frontend/dist;
    index index.html;

    # SPA 라우팅
    location / {
        try_files $uri $uri/ /index.html;
    }

    # METIS 경로 (DID 키오스크)
    location /METIS {
        alias /var/www/smart-did/library-did-main/packages/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 프록시
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # 영상 파일 (캐싱)
    location /api/videos {
        proxy_pass http://backend;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

활성화:

```bash
sudo ln -s /etc/nginx/sites-available/smart-did /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 모니터링

### 헬스 체크

```bash
# Backend 상태
curl http://localhost:3001/health

# Redis 상태
redis-cli ping

# 큐 상태
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/admin/queue/status
```

### 로그 확인

```bash
# Backend 로그
journalctl -u smart-did-backend -f

# Worker 로그
journalctl -u smart-did-worker -f

# Nginx 로그
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 주요 모니터링 지표

- 요청 처리량 (requests/sec)
- 응답 시간 (latency)
- 큐 길이 (waiting jobs)
- 영상 생성 성공/실패율
- Redis 메모리 사용량

## 보안

### SSL/TLS

```bash
# Let's Encrypt 설치
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d library.example.com
```

### 방화벽

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 보안 헤더 (Nginx)

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000" always;
```

### Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api {
    limit_req zone=api burst=20 nodelay;
    # ...
}
```

## 백업

### 데이터베이스

```bash
# SQLite 백업
cp /var/www/smart-did/library-did-main/packages/backend/prisma/prod.db /backup/

# PostgreSQL 백업
pg_dump smart_did | gzip > /backup/smart_did_$(date +%Y%m%d).sql.gz
```

### 영상 파일

```bash
# 로컬 백업
rsync -av /var/www/smart-did/library-did-main/packages/worker/storage/ /backup/videos/

# S3 동기화 (운영 시)
aws s3 sync /var/www/smart-did/storage/ s3://smart-did-backup/
```

### Redis

```bash
# RDB 스냅샷 설정
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

## 배포 체크리스트

- [ ] 환경 변수 설정 완료
- [ ] 시크릿 생성 및 보안 저장
- [ ] Redis 실행 확인
- [ ] FFmpeg 설치 확인
- [ ] DB 마이그레이션 완료
- [ ] SSL 인증서 설치
- [ ] 방화벽 설정
- [ ] 헬스 체크 정상
- [ ] 로그 로테이션 설정
- [ ] 백업 자동화 설정
- [ ] 모니터링 설정

## 트러블슈팅

### Worker 콜백 실패

```bash
# Backend와 Worker의 INTERNAL_API_SECRET 일치 확인
# BACKEND_URL이 Worker에서 접근 가능한지 확인
curl -X POST http://localhost:3001/api/internal/video-callback \
  -H "X-Internal-Secret: <secret>" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"test","status":"READY"}'
```

### 영상 생성 실패

```bash
# FFmpeg 설치 확인
ffmpeg -version

# API 키 확인 (Worker 로그)
journalctl -u smart-did-worker | grep "API_KEY"
```

### Redis 연결 실패

```bash
# Redis 상태 확인
systemctl status redis-server
redis-cli ping

# 연결 테스트
redis-cli -h localhost -p 6379 -a <password> ping
```
