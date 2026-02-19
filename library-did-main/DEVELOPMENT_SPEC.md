# 꿈샘 도서관 AI 영상 서비스 - 개발 명세서

> **Version**: 1.0.0
> **Last Updated**: 2026-02-02
> **Status**: MVP Development

---

## 1. 시스템 개요

### 1.1 서비스 목적
아산 꿈샘 아동청소년 도서관에서 도서 소개 영상을 AI(Veo3.1)로 자동 생성하여 DID(디지털 정보 디스플레이) 터치스크린 키오스크에서 제공하는 서비스

### 1.2 핵심 요구사항
1. **베스트셀러 100권 사전 생성** - 인기 도서는 미리 영상 생성
2. **실시간 요청 처리** - 사용자가 요청하면 큐에 추가
3. **중복 방지** - 동일 영상 재생성 방지
4. **LRU 캐시 관리** - 잘 안 찾는 영상은 오래된 것부터 삭제

### 1.3 기술 스택
```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  React 18 + TypeScript + Vite + TailwindCSS + Zustand       │
├─────────────────────────────────────────────────────────────┤
│                        Backend                               │
│  Fastify + TypeScript + Prisma ORM + SQLite                 │
├─────────────────────────────────────────────────────────────┤
│                      Queue System                            │
│  Redis + BullMQ                                              │
├─────────────────────────────────────────────────────────────┤
│                        Worker                                │
│  BullMQ Worker + Veo3.1 API + FFmpeg                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 시스템 아키텍처

### 2.1 전체 구조도
```
                                    ┌─────────────────┐
                                    │   React SPA     │
                                    │  (Vite Build)   │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
            ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
            │  일반 웹 UI   │       │  DID 터치 UI  │       │ 관리자 대시보드│
            │   /           │       │   /did        │       │   /admin      │
            └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Fastify API    │
                                    │  (Port 3000)    │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
            ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
            │    SQLite     │       │     Redis     │       │  ALPAS API    │
            │   (Prisma)    │       │   (BullMQ)    │       │  (도서관 DB)  │
            └───────────────┘       └───────┬───────┘       └───────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │  Video Worker   │
                                    │   (BullMQ)      │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
            ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
            │   Veo3.1 AI   │       │    FFmpeg     │       │ Local/S3 저장 │
            │  (영상 생성)  │       │  (영상 병합)  │       │   (Storage)   │
            └───────────────┘       └───────────────┘       └───────────────┘
```

### 2.2 디렉토리 구조
```
lib-mvp/
├── packages/
│   ├── frontend/                 # React SPA
│   │   └── src/
│   │       ├── api/              # API 클라이언트
│   │       │   ├── client.ts     # Axios 인스턴스
│   │       │   ├── did.api.ts    # DID 공개 API
│   │       │   ├── admin.api.ts  # 관리자 API
│   │       │   └── book.api.ts   # 도서 API
│   │       ├── pages/
│   │       │   ├── did/          # DID 터치 UI
│   │       │   └── admin/        # 관리자 UI
│   │       ├── components/
│   │       └── stores/           # Zustand 상태관리
│   │
│   ├── backend/                  # Fastify API Server
│   │   └── src/
│   │       ├── config/           # 환경설정
│   │       │   ├── index.ts      # 환경변수 로드
│   │       │   ├── database.ts   # Prisma 클라이언트
│   │       │   └── logger.ts     # Pino 로거
│   │       ├── routes/           # API 라우트
│   │       │   ├── did.routes.ts
│   │       │   ├── admin.routes.ts
│   │       │   └── book.routes.ts
│   │       ├── controllers/      # 요청 핸들러
│   │       ├── services/         # 비즈니스 로직 ⭐
│   │       │   ├── queue.service.ts           # 큐 관리
│   │       │   ├── cache-manager.service.ts   # LRU 캐시
│   │       │   ├── bestseller-seed.service.ts # 베스트셀러 시드
│   │       │   ├── scheduler.service.ts       # 스케줄러
│   │       │   ├── video.service.ts           # 영상 상태
│   │       │   └── alpas.service.ts           # 도서관 API
│   │       ├── repositories/     # DB 접근 계층
│   │       └── middleware/       # 인증 등
│   │
│   ├── worker/                   # 영상 생성 워커
│   │   └── src/
│   │       ├── worker.ts         # BullMQ Worker
│   │       └── services/
│   │           ├── video-generator.service.ts
│   │           ├── veo.service.ts
│   │           ├── prompt.service.ts
│   │           └── storage.service.ts
│   │
│   └── shared/                   # 공유 타입/유틸
│       └── src/
│           ├── types/
│           ├── constants/
│           └── utils/
│
├── prisma/
│   └── schema.prisma             # DB 스키마
├── docker-compose.yml
└── .env
```

---

## 3. 데이터 모델

### 3.1 Prisma Schema
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 관리자 계정
model AdminUser {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  role         String   @default("admin")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("admin_users")
}

// 영상 레코드 (핵심 테이블)
model VideoRecord {
  bookId          String    @id              // 책 ID (ALPAS book_key)
  status          String    @default("NONE") // NONE, QUEUED, GENERATING, READY, FAILED
  requestCount    Int       @default(0)      // 조회 횟수 (LRU용)
  lastRequestedAt DateTime?                  // 마지막 조회 시간 (LRU용)
  retryCount      Int       @default(0)      // 재시도 횟수
  rankingScore    Float     @default(0)      // 랭킹 점수 (조회수 + 최근성)
  expiresAt       DateTime?                  // 만료일 (기본 90일)
  videoUrl        String?                    // 생성된 영상 URL
  errorMessage    String?                    // 실패 시 에러 메시지
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("video_records")
}

// 서가 위치 매핑
model ShelfMap {
  id         String   @id @default(uuid())
  bookId     String   @unique
  shelfCode  String
  mapX       Float
  mapY       Float
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([shelfCode])
  @@map("shelf_maps")
}

// 알림
model Notification {
  id        String   @id @default(uuid())
  type      String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@map("notifications")
}
```

### 3.2 영상 상태 흐름 (State Machine)
```
┌──────┐    요청    ┌────────┐    워커 시작   ┌────────────┐    완료    ┌───────┐
│ NONE │ ─────────▶ │ QUEUED │ ────────────▶ │ GENERATING │ ─────────▶ │ READY │
└──────┘            └────────┘               └────────────┘            └───────┘
    ▲                   │                          │
    │                   │                          │ 실패
    │                   │                          ▼
    │                   │                    ┌──────────┐
    └───────────────────┴────── 재시도 ◀────│  FAILED  │
                                            └──────────┘
```

**상태 설명:**
| 상태 | 설명 | 전이 조건 |
|------|------|----------|
| `NONE` | 영상 없음 (초기 상태) | 사용자/관리자 요청 시 → QUEUED |
| `QUEUED` | 큐 대기 중 | 워커가 Job 가져가면 → GENERATING |
| `GENERATING` | 생성 중 | 완료 → READY, 실패 → FAILED |
| `READY` | 영상 준비됨 | 만료/캐시정리 시 → NONE |
| `FAILED` | 생성 실패 | 재시도 요청 시 → QUEUED |

---

## 4. 핵심 서비스 구현

### 4.1 큐 서비스 (queue.service.ts)

**역할:** BullMQ 큐 관리, 중복 방지, 우선순위 처리

```typescript
// packages/backend/src/services/queue.service.ts

import { Queue, Job, JobsOptions } from 'bullmq';
import { config } from '../config';
import { videoRepository } from '../repositories/video.repository';

export interface VideoJobData {
  bookId: string;
  title: string;
  author: string;
  summary: string;
  trigger: 'user_request' | 'admin_seed';
  retryCount?: number;
}

export class QueueService {
  private queue: Queue<VideoJobData>;

  constructor() {
    this.queue = new Queue<VideoJobData>('video-generation', {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        removeOnComplete: 100,  // 완료된 작업 100개만 유지
        removeOnFail: 50,       // 실패한 작업 50개만 유지
        attempts: 3,            // 최대 재시도 3회
        backoff: {
          type: 'exponential',
          delay: 5000,          // 5초부터 지수 증가
        },
      },
    });
  }

  /**
   * 영상 생성 작업을 큐에 추가
   * @param jobData 작업 데이터
   * @param priority 우선순위 (1=최고, 5=사용자, 20=시드)
   */
  async addVideoJob(
    jobData: VideoJobData,
    priority: number = 10
  ): Promise<Job<VideoJobData> | null> {
    const { bookId } = jobData;

    // 1. 중복 체크: DB 상태 확인
    const existingRecord = await videoRepository.findByBookId(bookId);
    if (existingRecord) {
      const { status } = existingRecord;
      // 이미 처리 중이거나 완료된 경우 스킵
      if (status === 'QUEUED' || status === 'GENERATING') {
        console.log(`[Queue] Skip: Book ${bookId} already in ${status} state`);
        return null;
      }
      if (status === 'READY' && existingRecord.videoUrl) {
        console.log(`[Queue] Skip: Book ${bookId} already has video`);
        return null;
      }
    }

    // 2. 큐에 동일 작업이 있는지 확인
    const existingJob = await this.findJobByBookId(bookId);
    if (existingJob) {
      console.log(`[Queue] Skip: Job for book ${bookId} already in queue`);
      return null;
    }

    // 3. DB에 QUEUED 상태로 기록
    if (existingRecord) {
      await videoRepository.update(bookId, {
        status: 'QUEUED',
        lastRequestedAt: new Date(),
        errorMessage: null,
      });
    } else {
      await videoRepository.create({
        bookId,
        status: 'QUEUED',
        expiresAt: this.calculateExpiryDate(),
      });
    }

    // 4. 큐에 작업 추가
    const job = await this.queue.add('generate-video', jobData, {
      jobId: `video-${bookId}-${Date.now()}`,
      priority,
    });

    console.log(`[Queue] Added job ${job.id} for book ${bookId} (priority: ${priority})`);
    return job;
  }

  /**
   * 사용자 요청 (높은 우선순위)
   */
  async addUserRequest(jobData: VideoJobData): Promise<Job<VideoJobData> | null> {
    return this.addVideoJob({ ...jobData, trigger: 'user_request' }, 5);
  }

  /**
   * 관리자 요청 (최우선순위)
   */
  async addAdminRequest(jobData: VideoJobData): Promise<Job<VideoJobData> | null> {
    return this.addVideoJob({ ...jobData, trigger: 'admin_seed' }, 1);
  }

  /**
   * 큐에서 bookId로 작업 찾기
   */
  private async findJobByBookId(bookId: string): Promise<Job<VideoJobData> | undefined> {
    const jobs = await this.queue.getJobs(['waiting', 'active', 'delayed']);
    return jobs.find((job) => job.data.bookId === bookId);
  }

  /**
   * 큐 상태 조회
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }

  /**
   * 만료일 계산 (기본 90일)
   */
  private calculateExpiryDate(): Date {
    const days = config.video.defaultExpiryDays;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }
}

export const queueService = new QueueService();
```

### 4.2 캐시 관리 서비스 (cache-manager.service.ts)

**역할:** LRU(Least Recently Used) 기반 자동 삭제

```typescript
// packages/backend/src/services/cache-manager.service.ts

import { videoRepository } from '../repositories/video.repository';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';

export class CacheManagerService {
  private maxVideos: number;           // 최대 보관 영상 수 (기본 500)
  private staleThresholdDays: number;  // 삭제 기준 일수 (기본 30)
  private storagePath: string;

  constructor() {
    this.maxVideos = parseInt(process.env.MAX_CACHED_VIDEOS || '500', 10);
    this.staleThresholdDays = parseInt(process.env.STALE_THRESHOLD_DAYS || '30', 10);
    this.storagePath = config.storage.path;
  }

  /**
   * LRU 기반 오래된 영상 삭제
   */
  async cleanupStaleVideos() {
    const details: Array<{ bookId: string; reason: string }> = [];
    let deletedCount = 0;
    let freedSpace = 0;

    // 1. 만료된 영상 삭제
    const expiredVideos = await this.getExpiredVideos();
    for (const video of expiredVideos) {
      const size = await this.deleteVideo(video.bookId);
      freedSpace += size;
      deletedCount++;
      details.push({ bookId: video.bookId, reason: 'expired' });
    }

    // 2. 최대 개수 초과 시 LRU 기반 삭제
    const totalVideos = await videoRepository.countByStatus('READY');
    if (totalVideos > this.maxVideos) {
      const toDelete = totalVideos - this.maxVideos;
      const staleVideos = await this.getStaleVideos(toDelete);

      for (const video of staleVideos) {
        const size = await this.deleteVideo(video.bookId);
        freedSpace += size;
        deletedCount++;
        details.push({ bookId: video.bookId, reason: 'lru_eviction' });
      }
    }

    // 3. 오랫동안 조회되지 않은 영상 삭제
    const unusedVideos = await this.getUnusedVideos();
    for (const video of unusedVideos) {
      const size = await this.deleteVideo(video.bookId);
      freedSpace += size;
      deletedCount++;
      details.push({ bookId: video.bookId, reason: 'unused' });
    }

    return { deleted: deletedCount, freedSpace, details };
  }

  /**
   * 만료된 영상 조회 (expiresAt < now)
   */
  private async getExpiredVideos() {
    return videoRepository.findAll({
      where: {
        status: 'READY',
        expiresAt: { lt: new Date() },
      },
    });
  }

  /**
   * LRU 기준 삭제 대상 조회
   * 정렬 기준: rankingScore 낮은 순 → lastRequestedAt 오래된 순
   */
  private async getStaleVideos(limit: number) {
    return videoRepository.findAll({
      where: { status: 'READY' },
      orderBy: [
        { rankingScore: 'asc' },
        { lastRequestedAt: 'asc' },
        { requestCount: 'asc' },
      ],
      take: limit,
    });
  }

  /**
   * 미사용 영상 조회
   * 조건: 30일 이상 미조회 AND 조회수 3 미만
   */
  private async getUnusedVideos() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - this.staleThresholdDays);

    return videoRepository.findAll({
      where: {
        status: 'READY',
        lastRequestedAt: { lt: threshold },
        requestCount: { lt: 3 },
      },
    });
  }

  /**
   * 영상 삭제 (파일 + DB)
   */
  private async deleteVideo(bookId: string): Promise<number> {
    let fileSize = 0;

    const record = await videoRepository.findByBookId(bookId);
    if (record?.videoUrl) {
      // 로컬 파일 삭제
      try {
        const filePath = path.resolve(this.storagePath, record.videoUrl);
        const stats = await fs.stat(filePath);
        fileSize = stats.size;
        await fs.unlink(filePath);
      } catch (err) {
        // 파일 없으면 무시
      }
    }

    // DB 상태 업데이트 (NONE으로 변경)
    await videoRepository.update(bookId, {
      status: 'NONE',
      videoUrl: null,
      rankingScore: 0,
    });

    return fileSize;
  }

  /**
   * 영상 조회 시 호출 (랭킹 점수 갱신)
   */
  async touchVideo(bookId: string): Promise<void> {
    const record = await videoRepository.findByBookId(bookId);
    if (record && record.status === 'READY') {
      await videoRepository.incrementRequestCount(bookId);

      // 랭킹 점수 재계산
      const newScore = this.calculateRankingScore(
        record.requestCount + 1,
        new Date()
      );
      await videoRepository.updateRankingScore(bookId, newScore);
    }
  }

  /**
   * 랭킹 점수 계산
   * 공식: rankingScore = requestCount + recencyBoost
   * recencyBoost = requestCount × 1.5 × (1 - daysSinceLastRequest / 7)
   */
  private calculateRankingScore(requestCount: number, lastRequestedAt: Date): number {
    const daysSinceRequest = (Date.now() - lastRequestedAt.getTime()) / (1000 * 60 * 60 * 24);

    let recencyBoost = 0;
    if (daysSinceRequest <= 7) {
      const recencyFactor = 1 - daysSinceRequest / 7;
      recencyBoost = requestCount * 1.5 * recencyFactor;
    }

    return requestCount + recencyBoost;
  }
}

export const cacheManagerService = new CacheManagerService();
```

### 4.3 베스트셀러 시드 서비스 (bestseller-seed.service.ts)

**역할:** 인기 도서 100권 사전 영상 생성

```typescript
// packages/backend/src/services/bestseller-seed.service.ts

import { queueService } from './queue.service';
import { alpasService } from './alpas.service';
import { videoRepository } from '../repositories/video.repository';

export class BestsellerSeedService {
  // 사전 생성할 베스트셀러 키워드
  private readonly BESTSELLER_KEYWORDS = [
    // 유아 추천
    '뽀로로', '핑크퐁', '구름빵', '강아지똥', '배고픈 애벌레',
    // 아동 추천
    '마법천자문', '그리스 로마 신화', '설민석', '흔한남매', '코딩',
    // 청소년 추천
    '어린왕자', '해리포터', '나미야 잡화점', '아몬드', '달러구트',
    // 일반 인기
    '셜록 홈즈', '삼국지', '돈키호테', '톰 소여', '보물섬',
  ];

  /**
   * 베스트셀러 시드 실행
   */
  async seedBestsellers(limit: number = 100) {
    const details: Array<{ title: string; status: string }> = [];
    let requested = 0;
    let skipped = 0;
    let failed = 0;

    const books: any[] = [];

    // 1. 키워드별로 책 검색하여 수집
    for (const keyword of this.BESTSELLER_KEYWORDS) {
      if (books.length >= limit) break;

      const searchResults = await alpasService.searchBooks(keyword);
      for (const book of searchResults) {
        if (books.length >= limit) break;
        // 중복 제거
        if (!books.find((b) => b.id === book.id)) {
          books.push(book);
        }
      }
    }

    // 2. 각 책에 대해 영상 생성 요청
    for (const book of books) {
      // 이미 영상이 있는지 확인
      const existingRecord = await videoRepository.findByBookId(book.id);
      if (existingRecord?.status === 'READY') {
        skipped++;
        details.push({ title: book.title, status: 'already_exists' });
        continue;
      }

      // 큐에 추가 (낮은 우선순위 20)
      const job = await queueService.addVideoJob(
        {
          bookId: book.id,
          title: book.title,
          author: book.author,
          summary: book.summary || '',
          trigger: 'admin_seed',
        },
        20  // 베스트셀러 시드는 낮은 우선순위
      );

      if (job) {
        requested++;
        details.push({ title: book.title, status: 'queued' });
      } else {
        skipped++;
        details.push({ title: book.title, status: 'skipped_duplicate' });
      }
    }

    return { requested, skipped, failed, details };
  }

  /**
   * 시드 상태 조회
   */
  async getSeedStatus() {
    const [ready, queued, generating, failed] = await Promise.all([
      videoRepository.countByStatus('READY'),
      videoRepository.countByStatus('QUEUED'),
      videoRepository.countByStatus('GENERATING'),
      videoRepository.countByStatus('FAILED'),
    ]);

    return {
      totalSeeded: ready + queued + generating + failed,
      ready,
      queued,
      generating,
      failed,
    };
  }
}

export const bestsellerSeedService = new BestsellerSeedService();
```

### 4.4 스케줄러 서비스 (scheduler.service.ts)

**역할:** 주기적 캐시/큐 정리

```typescript
// packages/backend/src/services/scheduler.service.ts

import { cacheManagerService } from './cache-manager.service';
import { queueService } from './queue.service';

export class SchedulerService {
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  /**
   * 스케줄러 시작
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 캐시 정리 - 6시간마다
    const cacheCleanup = setInterval(async () => {
      console.log('[Scheduler] Running cache cleanup');
      await cacheManagerService.cleanupStaleVideos();
    }, 6 * 60 * 60 * 1000);

    this.intervals.push(cacheCleanup);

    // 큐 정리 - 1시간마다
    const queueCleanup = setInterval(async () => {
      console.log('[Scheduler] Running queue cleanup');
      await queueService.cleanQueue();
    }, 60 * 60 * 1000);

    this.intervals.push(queueCleanup);
  }

  /**
   * 스케줄러 종료
   */
  stop() {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals = [];
    this.isRunning = false;
  }
}

export const schedulerService = new SchedulerService();
```

---

## 5. API 명세

### 5.1 DID 공개 API (인증 불필요)

#### 5.1.1 영상 상태 조회
```
GET /api/did/books/:bookId/video
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bookId": "12345",
    "status": "READY",           // NONE | QUEUED | GENERATING | READY | FAILED
    "videoUrl": "/videos/12345-1706789123.mp4",
    "message": "영상이 준비되어 있습니다."
  }
}
```

#### 5.1.2 영상 생성 요청
```
POST /api/did/books/:bookId/video/request
```

**동작:**
- `READY` → 영상 URL 즉시 반환
- `QUEUED/GENERATING` → 현재 상태 반환
- `NONE/FAILED` → 큐에 추가 후 QUEUED 반환

**Response:**
```json
{
  "success": true,
  "data": {
    "bookId": "12345",
    "status": "QUEUED",
    "videoUrl": null,
    "message": "영상 생성 요청이 접수되었습니다.",
    "queuePosition": 5
  }
}
```

#### 5.1.3 인기 영상 목록
```
GET /api/did/videos/popular?limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bookId": "12345",
      "title": "어린왕자",
      "author": "생텍쥐페리",
      "coverImageUrl": "https://...",
      "videoUrl": "/videos/12345.mp4",
      "requestCount": 150,
      "rankingScore": 225.5
    }
  ]
}
```

#### 5.1.4 도서 검색 (영상 상태 포함)
```
GET /api/did/search?q=어린왕자&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "12345",
      "title": "어린왕자",
      "author": "생텍쥐페리",
      "coverImageUrl": "https://...",
      "videoStatus": "READY",
      "hasVideo": true
    }
  ],
  "total": 15
}
```

### 5.2 관리자 API (JWT 인증 필요)

#### 5.2.1 대시보드 통계
```
GET /api/admin/dashboard/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": {
      "totalSeeded": 85,
      "ready": 72,
      "queued": 8,
      "generating": 3,
      "failed": 2
    },
    "queue": {
      "waiting": 8,
      "active": 2,
      "completed": 150,
      "failed": 5,
      "delayed": 0
    },
    "cache": {
      "totalVideos": 72,
      "maxVideos": 500,
      "usagePercent": 14,
      "totalSize": 1073741824
    }
  }
}
```

#### 5.2.2 베스트셀러 시드
```
POST /api/admin/seed/bestsellers?limit=100
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "베스트셀러 시드 시작: 85권 요청됨",
  "data": {
    "requested": 85,
    "skipped": 10,
    "failed": 5,
    "details": [
      { "title": "어린왕자", "status": "queued" },
      { "title": "해리포터", "status": "already_exists" }
    ]
  }
}
```

#### 5.2.3 큐 상태 조회
```
GET /api/admin/queue/stats
```

#### 5.2.4 대기 작업 목록
```
GET /api/admin/queue/waiting?limit=20
```

#### 5.2.5 작업 취소
```
DELETE /api/admin/queue/:bookId
```

#### 5.2.6 실패 작업 재시도
```
POST /api/admin/queue/:bookId/retry
```

#### 5.2.7 캐시 통계
```
GET /api/admin/cache/stats
```

#### 5.2.8 캐시 정리 (수동)
```
POST /api/admin/cache/cleanup
```

---

## 6. 워커 구현

### 6.1 BullMQ 워커 (worker.ts)

```typescript
// packages/worker/src/worker.ts

import { Worker, Job } from 'bullmq';
import { VideoJobData } from '@smart-did/shared';
import { config } from './config';
import { videoGeneratorService } from './services/video-generator.service';

export function createWorker(): Worker {
  const worker = new Worker(
    'video-generation',
    async (job: Job<VideoJobData>) => {
      console.log(`Processing job ${job.id} for book ${job.data.bookId}`);

      const result = await videoGeneratorService.generateVideo(job.data);

      if (!result.success) {
        throw new Error(result.error || 'Video generation failed');
      }

      return result;
    },
    {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
      },
      concurrency: 2,  // 동시 처리 수
      limiter: {
        max: 10,
        duration: 60000,  // 분당 10개 제한
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
    // DB 상태 업데이트: READY
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
    // DB 상태 업데이트: FAILED
  });

  return worker;
}
```

### 6.2 영상 생성 흐름

```
VideoJobData 수신
       │
       ▼
┌──────────────────┐
│ 1. 콘텐츠 안전성 │
│    검증          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. 프롬프트 생성 │
│  (3개 씬)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. Veo3.1 API    │
│  호출 (씬별)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. FFmpeg 병합   │
│  (3개 씬 → 1개)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. 자막 생성     │
│  (VTT 포맷)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 6. 저장소 업로드 │
│  (Local/S3)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 7. DB 상태 갱신  │
│  status=READY    │
│  videoUrl=...    │
└──────────────────┘
```

### 6.3 프롬프트 생성 (prompt.service.ts)

```typescript
// 씬 1: 도입부 (8초)
const scene1Prompt = `
Generate an 8-second intro scene using Veo3.1.
- title: ${title}
- author: ${author}
Safety: Child-friendly, no horror/violence.
Goals:
- Display book title + author
- Korean subtitles: "${title}, ${author} 작가님의 작품입니다."
- Warm, welcoming visuals
`;

// 씬 2: 본문 (8초)
const scene2Prompt = `
Generate an 8-second main content scene.
- summary: ${summary}
Safety: Child-friendly.
Goals:
- Highlight key idea
- Korean subtitles: "이 책은 ${mainIdea}에 대한 이야기입니다."
`;

// 씬 3: 마무리 (8초)
const scene3Prompt = `
Generate an 8-second conclusion scene.
Goals:
- Warm closing visuals
- Korean subtitles: "재미있게 읽어보세요!"
`;
```

---

## 7. 환경 설정

### 7.1 환경 변수 (.env)

```env
# ===================
# Server
# ===================
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# ===================
# Database
# ===================
DATABASE_URL="file:./dev.db"

# ===================
# Redis (BullMQ)
# ===================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ===================
# JWT Authentication
# ===================
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# ===================
# Veo3.1 API
# ===================
VEO_API_KEY=your-veo-api-key
VEO_API_ENDPOINT=https://api.veo.example.com/v1

# ===================
# Storage
# ===================
STORAGE_TYPE=local        # local | s3
STORAGE_PATH=./storage/videos

# S3 설정 (STORAGE_TYPE=s3인 경우)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=ap-northeast-2
# S3_BUCKET=smart-did-videos

# ===================
# Video Settings
# ===================
VIDEO_DEFAULT_EXPIRY_DAYS=90
VIDEO_MAX_RETRIES=3
VIDEO_SCENE_DURATION=8

# ===================
# Cache Settings (LRU)
# ===================
MAX_CACHED_VIDEOS=500
STALE_THRESHOLD_DAYS=30

# ===================
# Worker
# ===================
WORKER_CONCURRENCY=2

# ===================
# Admin
# ===================
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin1234

# ===================
# ALPAS Library API
# ===================
ALPAS_API_URL=http://www.alpas.kr/BTLMS/HOMEPAGE/API
ALPAS_API_KEY=
```

---

## 8. 실행 가이드

### 8.1 개발 환경 설정

```bash
# 1. 저장소 클론
git clone <repository>
cd lib-mvp

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 4. Redis 실행
docker run -d -p 6379:6379 redis:alpine

# 5. 데이터베이스 초기화
cd packages/backend
npx prisma migrate dev
npx prisma generate
npm run seed

# 6. 개발 서버 실행
cd ../..
npm run dev
```

### 8.2 프로덕션 배포

```bash
# Docker Compose로 전체 서비스 실행
docker-compose up -d

# 또는 개별 빌드
docker build -f Dockerfile.backend -t smart-did-backend .
docker build -f Dockerfile.frontend -t smart-did-frontend .
docker build -f Dockerfile.worker -t smart-did-worker .
```

### 8.3 베스트셀러 시드 실행

```bash
# 1. 관리자 로그인
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin1234"}'

# 응답에서 token 추출

# 2. 베스트셀러 시드 실행
curl -X POST "http://localhost:3000/api/admin/seed/bestsellers?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 9. 우선순위 및 랭킹 정책

### 9.1 큐 우선순위

| 우선순위 | 값 | 설명 |
|---------|-----|------|
| 최우선 | 1 | 관리자 수동 요청 |
| 높음 | 5 | 사용자 실시간 요청 |
| 보통 | 10 | 기본값 |
| 낮음 | 20 | 베스트셀러 시드 |

### 9.2 랭킹 점수 계산

```
rankingScore = requestCount + recencyBoost

where:
  - requestCount: 총 조회 횟수
  - recencyBoost: 최근성 가중치
    = requestCount × 1.5 × max(0, 1 - daysSinceLastRequest / 7)
```

**예시:**
- 조회수 100, 오늘 조회 → 100 + 150 = 250
- 조회수 100, 7일 전 조회 → 100 + 0 = 100
- 조회수 50, 3일 전 조회 → 50 + 32.1 = 82.1

### 9.3 LRU 삭제 정책

**삭제 대상 (우선순위 순):**
1. `expiresAt < now()` - 만료된 영상
2. `totalVideos > 500` - 최대 개수 초과 시 낮은 점수부터
3. `lastRequestedAt < 30일 전 AND requestCount < 3` - 미사용 영상

---

## 10. 확인 필요 사항

- [ ] 유아/아동/청소년 추천이 단순 카테고리인지, 별도 추천 로직 필요한지
- [ ] ALPAS API Key 전달 여부
- [ ] 책 메타데이터 및 요약 데이터 형식 확인
- [ ] Veo3.1 API 스펙 확인 (현재 Mock 구현)

---

## 11. 참고 자료

- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Vite Documentation](https://vitejs.dev/guide/)
