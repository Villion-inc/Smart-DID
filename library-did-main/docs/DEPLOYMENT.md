# Deployment Guide

Production deployment instructions for Smart DID Video Service.

## Table of Contents

- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Database Migration](#database-migration)
- [Monitoring & Logging](#monitoring--logging)
- [Scaling](#scaling)
- [Security](#security)
- [Backup & Recovery](#backup--recovery)

## Environment Setup

### Required Infrastructure

- **Compute**: 2+ CPU cores, 4GB+ RAM
- **Redis**: For queue management
- **Database**: PostgreSQL 14+ or MongoDB 6+
- **Storage**: S3-compatible storage for videos
- **SSL Certificate**: For HTTPS

### Environment Variables

Create `.env.production`:

```env
# Environment
NODE_ENV=production

# Backend
PORT=3000
API_PREFIX=/api

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/smart_did

# JWT
JWT_SECRET=<generate-strong-random-secret>
JWT_EXPIRES_IN=3600

# Redis
REDIS_HOST=redis.production.internal
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# Storage (S3)
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=smart-did-videos

# Veo3.1
VEO_API_KEY=<production-veo-key>
VEO_API_ENDPOINT=https://api.veo.example.com/v1

# Video Settings
VIDEO_DEFAULT_EXPIRY_DAYS=90
VIDEO_MAX_RETRIES=3

# Worker
WORKER_CONCURRENCY=4

# Admin
ADMIN_USERNAME=<production-admin>
ADMIN_PASSWORD=<strong-password>

# ALPAS Integration
ALPAS_API_URL=https://alpas.library.example.com/api
ALPAS_API_KEY=<alpas-api-key>
```

### Generate Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate admin password hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your-password', 10).then(console.log)"
```

## Docker Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Build Images

```bash
# Build all images
docker-compose build

# Or build individually
docker build -f Dockerfile.backend -t smart-did-backend .
docker build -f Dockerfile.frontend -t smart-did-frontend .
docker build -f Dockerfile.worker -t smart-did-worker .
```

### Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop services
docker-compose down
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    command: redis-server --requirepass ${REDIS_PASSWORD}
    networks:
      - internal

  backend:
    image: smart-did-backend:latest
    restart: always
    env_file: .env.production
    depends_on:
      - redis
    networks:
      - internal
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"

  worker:
    image: smart-did-worker:latest
    restart: always
    env_file: .env.production
    depends_on:
      - redis
      - backend
    networks:
      - internal

  frontend:
    image: smart-did-frontend:latest
    restart: always
    depends_on:
      - backend
    networks:
      - web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`library.example.com`)"

networks:
  internal:
  web:
    external: true

volumes:
  redis_data:
```

Deploy:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Manual Deployment

### 1. Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install nginx
sudo apt install -y nginx
```

### 2. Clone and Build

```bash
# Clone repository
git clone https://github.com/your-org/smart-did.git
cd smart-did

# Install dependencies
npm install

# Build all packages
npm run build
```

### 3. Configure Nginx

Create `/etc/nginx/sites-available/smart-did`:

```nginx
upstream backend {
    server 127.0.0.1:3000;
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

    root /var/www/smart-did/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /videos {
        alias /var/www/smart-did/storage/videos;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/smart-did /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Set Up Systemd Services

**Backend Service** (`/etc/systemd/system/smart-did-backend.service`):

```ini
[Unit]
Description=Smart DID Backend API
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/smart-did/packages/backend
EnvironmentFile=/var/www/smart-did/.env.production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Worker Service** (`/etc/systemd/system/smart-did-worker.service`):

```ini
[Unit]
Description=Smart DID Video Worker
After=network.target redis.service smart-did-backend.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/smart-did/packages/worker
EnvironmentFile=/var/www/smart-did/.env.production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable smart-did-backend smart-did-worker
sudo systemctl start smart-did-backend smart-did-worker
sudo systemctl status smart-did-backend smart-did-worker
```

## Database Migration

### From In-Memory to PostgreSQL

1. **Install PostgreSQL**:

```bash
sudo apt install postgresql postgresql-contrib
```

2. **Create Database**:

```bash
sudo -u postgres psql
CREATE DATABASE smart_did;
CREATE USER smart_did_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE smart_did TO smart_did_user;
\q
```

3. **Update Backend** to use PostgreSQL (example with Prisma):

```bash
cd packages/backend
npm install @prisma/client prisma
npx prisma init
```

4. **Create Schema** (`packages/backend/prisma/schema.prisma`):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Book {
  bookId        String   @id
  title         String
  author        String
  summary       String
  genre         String
  shelfCode     String
  createdAt     DateTime @default(now())
  videoRecord   VideoRecord?
}

model VideoRecord {
  bookId          String   @id
  status          String
  videoUrl        String?
  subtitleUrl     String?
  requestCount    Int      @default(0)
  lastRequestedAt DateTime?
  retryCount      Int      @default(0)
  rankingScore    Float    @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  expiresAt       DateTime?
  errorMessage    String?
  book            Book     @relation(fields: [bookId], references: [bookId])
}
```

5. **Run Migration**:

```bash
npx prisma migrate dev --name init
```

## Monitoring & Logging

### Application Logs

Logs are written to:
- Backend: `/var/log/smart-did/backend/`
- Worker: `/var/log/smart-did/worker/`

Configure log rotation (`/etc/logrotate.d/smart-did`):

```
/var/log/smart-did/*/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
}
```

### Monitoring Stack

Use Prometheus + Grafana:

1. **Install Prometheus**
2. **Add metrics endpoint** to backend
3. **Create Grafana dashboards**

Key metrics to monitor:
- Request rate
- Response time
- Error rate
- Queue length
- Video generation success/failure rate
- Redis memory usage

### Health Checks

```bash
# Backend health
curl https://api.example.com/health

# Worker status (via Redis)
redis-cli -h localhost -p 6379 llen bull:video-generation:waiting
```

## Scaling

### Horizontal Scaling

**Backend API** (stateless):
- Run multiple instances behind load balancer
- Use session affinity if needed

**Worker**:
- Scale workers independently
- Set `WORKER_CONCURRENCY` per worker
- Workers auto-distribute via Redis queue

### Vertical Scaling

Adjust resources based on load:
- CPU: For video processing
- Memory: For queue processing
- Redis: For queue storage

### Auto-Scaling (Kubernetes)

Example HPA:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: smart-did-backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: smart-did-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Security

### SSL/TLS

Use Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d library.example.com
```

### Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Security Headers

Add to nginx:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000" always;
```

### Rate Limiting

Configure nginx rate limiting:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api {
    limit_req zone=api burst=20 nodelay;
    # ...
}
```

## Backup & Recovery

### Database Backup

```bash
# Automated daily backup
0 2 * * * pg_dump smart_did | gzip > /backup/smart_did_$(date +\%Y\%m\%d).sql.gz
```

### Video Storage Backup

If using S3, enable versioning and cross-region replication.

### Redis Backup

```bash
# Enable RDB snapshots
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

### Disaster Recovery Plan

1. Database: Restore from latest backup
2. Videos: Restore from S3/backup
3. Code: Redeploy from Git
4. Configuration: Restore from secrets manager

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Secrets generated and secured
- [ ] Database migrated and backed up
- [ ] SSL/TLS certificates installed
- [ ] Firewall configured
- [ ] Monitoring set up
- [ ] Log rotation configured
- [ ] Backups automated
- [ ] Health checks working
- [ ] Rate limiting enabled
- [ ] Error tracking configured
- [ ] Documentation updated

---

**Your production deployment is ready!** Monitor closely in the first few days and adjust resources as needed.
