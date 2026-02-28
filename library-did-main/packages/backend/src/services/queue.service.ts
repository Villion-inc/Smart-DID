import { Queue, Job, JobsOptions } from 'bullmq';
import { config } from '../config';

// Video job data type (matches @smart-did/shared)
export interface VideoJobData {
  bookId: string;
  title: string;
  author: string;
  summary: string;
  trigger: 'user_request' | 'admin_seed';
  retryCount?: number;
  // 추가 책 정보 (VideoRecord에 저장용)
  publisher?: string;
  coverImageUrl?: string;
  category?: string;
}
import { videoRepository } from '../repositories/video.repository';
import { notificationRepository } from '../repositories/notification.repository';

/**
 * Queue Service
 * - 중복 생성 방지: 이미 QUEUED/GENERATING 상태면 큐에 추가하지 않음
 * - 우선순위 지원: 관리자 요청 > 사용자 요청
 * - 베스트셀러 사전 생성 지원
 */
export class QueueService {
  private queue: Queue<VideoJobData> | null = null;

  private getQueue(): Queue<VideoJobData> {
    if (!this.queue) {
      if (!config.redis.host || config.redis.host === 'localhost') {
        throw new Error('Redis not configured - queue operations disabled');
      }
      this.queue = new Queue<VideoJobData>('video-generation', {
        connection: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: config.video.maxRetries,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      });
    }
    return this.queue;
  }

  private isQueueEnabled(): boolean {
    return !!config.redis.host && config.redis.host !== 'localhost';
  }

  /**
   * 영상 생성 작업을 큐에 추가
   * @param jobData 작업 데이터
   * @param priority 우선순위 (낮을수록 먼저 실행, 1=높음, 10=보통, 20=낮음)
   * @returns 추가된 Job 또는 null (이미 존재하는 경우)
   */
  async addVideoJob(
    jobData: VideoJobData,
    priority: number = 10
  ): Promise<Job<VideoJobData> | null> {
    const { bookId } = jobData;

    // 1. 중복 체크: 이미 QUEUED/GENERATING 상태인지 확인
    const existingRecord = await videoRepository.findByBookId(bookId);
    if (existingRecord) {
      const { status } = existingRecord;
      if (status === 'QUEUED' || status === 'GENERATING') {
        return null;
      }
      if (status === 'READY' && existingRecord.videoUrl) {
        return null;
      }
    }

    // 2. 큐에 같은 bookId 작업이 있는지 확인
    const existingJob = await this.findJobByBookId(bookId);
    if (existingJob) {
      return null;
    }

    // 3. DB에 QUEUED 상태로 기록 (upsert로 동시 요청 시 unique 제약 오류 방지)
    // 책 정보도 함께 저장하여 ALPAS API 없이도 표시 가능하도록
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

    // 4. 큐에 작업 추가
    if (!this.isQueueEnabled()) {
      console.warn('[QueueService] Redis not configured, skipping queue add');
      return null;
    }

    const jobOptions: JobsOptions = {
      jobId: `video-${bookId}-${Date.now()}`,
      priority,
    };

    const job = await this.getQueue().add('generate-video', jobData, jobOptions);
    return job;
  }

  /**
   * 베스트셀러 100권 사전 생성 (낮은 우선순위)
   */
  async seedBestsellers(books: Array<{
    bookId: string;
    title: string;
    author: string;
    summary: string;
  }>): Promise<number> {
    let addedCount = 0;

    for (const book of books) {
      const jobData: VideoJobData = {
        bookId: book.bookId,
        title: book.title,
        author: book.author,
        summary: book.summary,
        trigger: 'admin_seed',
      };

      // 낮은 우선순위 (20)로 추가 - 사용자 요청이 우선
      const job = await this.addVideoJob(jobData, 20);
      if (job) {
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
  async addUserRequest(jobData: VideoJobData): Promise<Job<VideoJobData> | null> {
    // 사용자 요청은 우선순위 5
    return this.addVideoJob({ ...jobData, trigger: 'user_request' }, 5);
  }

  /**
   * 관리자 요청으로 영상 생성 큐에 추가 (최우선순위)
   */
  async addAdminRequest(jobData: VideoJobData): Promise<Job<VideoJobData> | null> {
    // 관리자 요청은 우선순위 1
    return this.addVideoJob({ ...jobData, trigger: 'admin_seed' }, 1);
  }

  /**
   * 큐에서 bookId로 작업 찾기
   */
  private async findJobByBookId(bookId: string): Promise<Job<VideoJobData> | undefined> {
    if (!this.isQueueEnabled()) return undefined;
    const jobs = await this.getQueue().getJobs(['waiting', 'active', 'delayed']);
    return jobs.find((job) => job.data.bookId === bookId);
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
    const queue = this.getQueue();
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * 대기 중인 작업 목록 조회
   */
  async getWaitingJobs(limit: number = 20): Promise<Array<{
    jobId: string;
    bookId: string;
    title: string;
    priority: number;
    addedAt: Date;
  }>> {
    if (!this.isQueueEnabled()) return [];
    const jobs = await this.getQueue().getJobs(['waiting'], 0, limit);
    return jobs.map((job) => ({
      jobId: job.id || '',
      bookId: job.data.bookId,
      title: job.data.title,
      priority: job.opts.priority || 10,
      addedAt: new Date(job.timestamp),
    }));
  }

  /**
   * 특정 작업 취소
   * 큐에서 작업을 찾아 삭제하고, DB 상태도 업데이트
   */
  async cancelJob(bookId: string): Promise<boolean> {
    // 1. 큐에서 작업 찾아서 삭제 시도
    const job = await this.findJobByBookId(bookId);
    if (job) {
      try {
        await job.remove();
      } catch (e) {
        console.warn(`Failed to remove job from queue: ${e}`);
      }
    }

    // 2. DB에서 QUEUED/GENERATING 상태인 경우 NONE으로 변경
    const record = await videoRepository.findByBookId(bookId);
    if (record && (record.status === 'QUEUED' || record.status === 'GENERATING')) {
      await videoRepository.update(bookId, {
        status: 'NONE',
        errorMessage: 'Cancelled by admin',
      });
      return true;
    }

    // 큐에서 삭제했으면 성공
    if (job) {
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
   * 큐 정리 (완료/실패된 작업 삭제)
   */
  async cleanQueue(): Promise<void> {
    if (!this.isQueueEnabled()) return;
    const queue = this.getQueue();
    await queue.clean(24 * 60 * 60 * 1000, 100, 'completed');
    await queue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed');
  }
}

export const queueService = new QueueService();
