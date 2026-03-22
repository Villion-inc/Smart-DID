import { Queue } from 'bullmq';
import { config } from '../config';
import { videoRepository } from '../repositories/video.repository';
import { notificationRepository } from '../repositories/notification.repository';

export interface VideoJobData {
  bookId: string;
  title: string;
  author: string;
  summary: string;
  trigger: 'user_request' | 'admin_seed';
  retryCount?: number;
  publisher?: string;
  coverImageUrl?: string;
  category?: string;
}

const QUEUE_NAME = 'video-generation';

/**
 * Queue Service (BullMQ + Redis based)
 * - Redis 기반 큐 (Cloud Memorystore)
 * - 중복 생성 방지: 이미 QUEUED/GENERATING 상태면 큐에 추가하지 않음
 * - 우선순위 지원: 관리자 요청 > 사용자 요청
 */
export class QueueService {
  private queue: Queue | null = null;
  private initialized = false;

  private getRedisConfig() {
    const host = process.env.REDIS_HOST;
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    if (!host) {
      return null;
    }

    return { host, port, password };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const redisConfig = this.getRedisConfig();
    if (!redisConfig) {
      console.warn('[QueueService] REDIS_HOST not configured, queue disabled');
      return;
    }

    try {
      console.log(`[QueueService] Initializing BullMQ with Redis at ${redisConfig.host}:${redisConfig.port}...`);
      
      this.queue = new Queue(QUEUE_NAME, {
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      });

      await this.queue.waitUntilReady();
      
      this.initialized = true;
      console.log('[QueueService] BullMQ initialized successfully');
    } catch (error) {
      console.error('[QueueService] Failed to initialize BullMQ:', error);
    }
  }

  private isQueueEnabled(): boolean {
    return this.initialized && this.queue !== null;
  }

  /**
   * 영상 생성 작업을 큐에 추가
   * @param jobData 작업 데이터
   * @param priority 우선순위 (낮을수록 먼저 실행, 1=높음, 10=보통, 20=낮음)
   * @returns 추가된 Job ID 또는 null (이미 존재하는 경우)
   */
  async addVideoJob(
    jobData: VideoJobData,
    priority: number = 10
  ): Promise<string | null> {
    const { bookId } = jobData;

    // 1. 중복 체크: 이미 QUEUED/GENERATING 상태인지 확인
    const existingRecord = await videoRepository.findByBookId(bookId);
    if (existingRecord) {
      const { status } = existingRecord;
      if (status === 'QUEUED' || status === 'GENERATING') {
        console.log(`[QueueService] Job already exists for ${bookId} with status ${status}`);
        return null;
      }
      if (status === 'READY' && existingRecord.videoUrl) {
        console.log(`[QueueService] Video already ready for ${bookId}`);
        return null;
      }
    }

    // 2. DB에 QUEUED 상태로 기록
    const expiresAt = this.calculateExpiryDate();
    await videoRepository.upsert(
      bookId,
      {
        bookId,
        status: 'QUEUED',
        expiresAt,
        title: jobData.title,
        author: jobData.author,
        summary: jobData.summary,
        publisher: jobData.publisher,
        coverImageUrl: jobData.coverImageUrl,
        category: jobData.category,
      },
      {
        status: 'QUEUED',
        lastRequestedAt: new Date(),
        errorMessage: null,
        expiresAt,
        title: jobData.title,
        author: jobData.author,
        summary: jobData.summary,
        publisher: jobData.publisher,
        coverImageUrl: jobData.coverImageUrl,
        category: jobData.category,
      }
    );

    // 3. 큐에 작업 추가
    if (!this.isQueueEnabled()) {
      console.warn('[QueueService] Queue not initialized, skipping queue add');
      return null;
    }

    try {
      const job = await this.queue!.add(QUEUE_NAME, jobData, {
        priority,
        jobId: `book-${bookId}`,
      });
      console.log(`[QueueService] Job added: ${job.id} for book ${bookId}`);
      return job.id || null;
    } catch (error) {
      console.error('[QueueService] Failed to add job:', error);
      return null;
    }
  }

  /**
   * 베스트셀러 100권 사전 생성 (낮은 우선순위)
   */
  async seedBestsellers(
    books: Array<{
      bookId: string;
      title: string;
      author: string;
      summary: string;
    }>
  ): Promise<number> {
    let addedCount = 0;

    for (const book of books) {
      const jobData: VideoJobData = {
        bookId: book.bookId,
        title: book.title,
        author: book.author,
        summary: book.summary,
        trigger: 'admin_seed',
      };

      const jobId = await this.addVideoJob(jobData, 20);
      if (jobId) {
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await notificationRepository.create({
        type: 'bestseller_seed',
        message: `베스트셀러 ${addedCount}권 영상 생성이 시작되었습니다.`,
      });
    }

    return addedCount;
  }

  /**
   * 사용자 요청으로 영상 생성 큐에 추가 (높은 우선순위)
   */
  async addUserRequest(jobData: VideoJobData): Promise<string | null> {
    return this.addVideoJob({ ...jobData, trigger: 'user_request' }, 5);
  }

  /**
   * 관리자 요청으로 영상 생성 큐에 추가 (최우선순위)
   */
  async addAdminRequest(jobData: VideoJobData): Promise<string | null> {
    return this.addVideoJob({ ...jobData, trigger: 'admin_seed' }, 1);
  }

  /**
   * 큐 상태 조회
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    if (!this.isQueueEnabled()) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue!.getWaitingCount(),
        this.queue!.getActiveCount(),
        this.queue!.getCompletedCount(),
        this.queue!.getFailedCount(),
        this.queue!.getDelayedCount(),
      ]);
      return { waiting, active, completed, failed, delayed };
    } catch {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }

  /**
   * 대기 중인 작업 목록 조회
   */
  async getWaitingJobs(
    limit: number = 20
  ): Promise<
    Array<{
      jobId: string;
      bookId: string;
      title: string;
      priority: number;
      addedAt: Date;
    }>
  > {
    if (!this.isQueueEnabled()) return [];

    try {
      const jobs = await this.queue!.getWaiting(0, limit - 1);
      return jobs.map((job) => ({
        jobId: job.id || '',
        bookId: job.data.bookId,
        title: job.data.title,
        priority: job.opts?.priority || 10,
        addedAt: new Date(job.timestamp),
      }));
    } catch {
      return [];
    }
  }

  /**
   * 특정 작업 취소
   */
  async cancelJob(bookId: string): Promise<boolean> {
    const record = await videoRepository.findByBookId(bookId);
    if (record && (record.status === 'QUEUED' || record.status === 'GENERATING')) {
      await videoRepository.update(bookId, {
        status: 'NONE',
        errorMessage: 'Cancelled by admin',
      });

      if (this.isQueueEnabled()) {
        try {
          const job = await this.queue!.getJob(bookId);
          if (job) {
            await job.remove();
          }
        } catch (error) {
          console.error('[QueueService] Failed to remove job from queue:', error);
        }
      }

      return true;
    }
    return false;
  }

  /**
   * 실패한 작업 재시도
   */
  async retryFailedJob(bookId: string): Promise<boolean> {
    const record = await videoRepository.findByBookId(bookId);
    if (record && record.status === 'FAILED') {
      await videoRepository.update(bookId, {
        status: 'QUEUED',
        retryCount: record.retryCount + 1,
        errorMessage: null,
      });

      if (this.isQueueEnabled()) {
        try {
          const job = await this.queue!.getJob(bookId);
          if (job) {
            await job.retry();
          }
        } catch (error) {
          console.error('[QueueService] Failed to retry job:', error);
        }
      }

      return true;
    }
    return false;
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

  /**
   * BullMQ Queue 인스턴스 반환
   */
  getQueue(): Queue | null {
    return this.queue;
  }

  /**
   * 큐 정리 (완료/실패된 작업 삭제)
   */
  async cleanQueue(): Promise<void> {
    if (!this.isQueueEnabled()) return;

    try {
      await this.queue!.clean(1000 * 60 * 60 * 24 * 7, 1000, 'completed');
      await this.queue!.clean(1000 * 60 * 60 * 24 * 7, 1000, 'failed');
    } catch (error) {
      console.error('[QueueService] Failed to clean queue:', error);
    }
  }

  /**
   * 큐 종료
   */
  async stop(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.initialized = false;
    }
  }
}

export const queueService = new QueueService();
