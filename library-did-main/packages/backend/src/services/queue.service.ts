import { PgBoss } from 'pg-boss';
import { config } from '../config';
import { videoRepository } from '../repositories/video.repository';
import { notificationRepository } from '../repositories/notification.repository';

// Video job data type (matches @smart-did/shared)
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
 * Queue Service (pg-boss based)
 * - PostgreSQL 기반 큐 (Redis 불필요)
 * - 중복 생성 방지: 이미 QUEUED/GENERATING 상태면 큐에 추가하지 않음
 * - 우선순위 지원: 관리자 요청 > 사용자 요청
 */
export class QueueService {
  private boss: PgBoss | null = null;
  private initialized = false;

  private getDatabaseUrl(): string | null {
    return process.env.DATABASE_URL || null;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const dbUrl = this.getDatabaseUrl();
    if (!dbUrl) {
      console.warn('[QueueService] DATABASE_URL not configured, queue disabled');
      return;
    }

    try {
      this.boss = new PgBoss({
        connectionString: dbUrl,
      });

      this.boss.on('error', (error: Error) => {
        console.error('[QueueService] pg-boss error:', error);
      });

      await this.boss.start();
      
      // Create queue if not exists (pg-boss v10+ requires explicit queue creation)
      await this.boss.createQueue(QUEUE_NAME);
      
      this.initialized = true;
      console.log('[QueueService] pg-boss initialized successfully');
    } catch (error) {
      console.error('[QueueService] Failed to initialize pg-boss:', error);
    }
  }

  private isQueueEnabled(): boolean {
    return this.initialized && this.boss !== null;
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
        return null;
      }
      if (status === 'READY' && existingRecord.videoUrl) {
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
      const jobId = await this.boss!.send(QUEUE_NAME, jobData, {
        priority,
        singletonKey: bookId, // 같은 bookId는 중복 방지
      });
      return jobId;
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
      const queues = await this.boss!.getQueues();
      const queue = queues.find((q: { name: string }) => q.name === QUEUE_NAME);
      return {
        waiting: (queue as any)?.size || 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
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

    // pg-boss doesn't have a direct method to list waiting jobs
    // We can query from VideoRecord with QUEUED status instead
    return [];
  }

  /**
   * 특정 작업 취소
   */
  async cancelJob(bookId: string): Promise<boolean> {
    // DB에서 QUEUED/GENERATING 상태인 경우 NONE으로 변경
    const record = await videoRepository.findByBookId(bookId);
    if (record && (record.status === 'QUEUED' || record.status === 'GENERATING')) {
      await videoRepository.update(bookId, {
        status: 'NONE',
        errorMessage: 'Cancelled by admin',
      });
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
   * pg-boss 인스턴스 반환 (worker에서 사용)
   */
  getBoss(): PgBoss | null {
    return this.boss;
  }

  /**
   * 큐 정리 (완료/실패된 작업 삭제) - pg-boss는 자동으로 아카이브하므로 no-op
   */
  async cleanQueue(): Promise<void> {
    // pg-boss handles archiving automatically via archiveCompletedAfterSeconds
  }

  /**
   * 큐 종료
   */
  async stop(): Promise<void> {
    if (this.boss) {
      await this.boss.stop();
      this.initialized = false;
    }
  }
}

export const queueService = new QueueService();
