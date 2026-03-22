import { videoRepository } from '../repositories/video.repository';
import { VideoStatus } from '../types';
import { notificationRepository } from '../repositories/notification.repository';
import { bookService } from './book.service';
import { VideoStatusResponse } from '../types';
import { config } from '../config';
import { queueService } from './queue.service';
import prisma from '../config/database';

export class VideoService {
  /**
   * Get video status for a book
   */
  async getVideoStatus(bookId: string): Promise<VideoStatusResponse | null> {
    const record = await videoRepository.findByBookId(bookId);
    if (!record) {
      return null;
    }

    return this.toStatusResponse(record);
  }

  /**
   * Request video generation (user or admin)
   * @param bookId - Book identifier
   * @param isAdminRequest - Whether this is an admin request
   * @param bookInfo - Optional book info (title, author) to use if not found in cache
   */
  async requestVideo(
    bookId: string,
    isAdminRequest: boolean = false,
    bookInfo?: { title?: string; author?: string; summary?: string; publisher?: string; coverImageUrl?: string; category?: string }
  ): Promise<VideoStatusResponse> {
    let book: any = null;

    // REC- prefix인 경우 Recommendation 테이블에서 조회
    if (bookId.startsWith('REC-')) {
      const recommendation = await prisma.recommendation.findFirst({
        where: { bookId },
      });
      if (recommendation) {
        console.log(`[VideoService] Found recommendation: ${recommendation.title}`);
        book = {
          id: bookId,
          title: recommendation.title,
          author: recommendation.author,
          summary: recommendation.summary || '',
          publisher: recommendation.publisher || '',
          publishedYear: 0,
          isbn: '',
          callNumber: '',
          registrationNumber: '',
          shelfCode: '',
          isAvailable: true,
          category: recommendation.category || '',
          coverImageUrl: recommendation.coverImageUrl,
        };
      }
    } else {
      // 일반 도서는 bookService에서 조회
      book = await bookService.getBookDetail(bookId);
    }
    
    // If book not found but info provided, create minimal book object
    if (!book && bookInfo?.title) {
      console.log(`[VideoService] Using provided book info: ${bookInfo.title}`);
      book = {
        id: bookId,
        title: bookInfo.title,
        author: bookInfo.author || '저자 미상',
        summary: bookInfo.summary || '',
        publisher: bookInfo.publisher || '',
        publishedYear: 0,
        isbn: '',
        callNumber: '',
        registrationNumber: '',
        shelfCode: '',
        isAvailable: true,
        category: bookInfo.category || '',
        coverImageUrl: bookInfo.coverImageUrl,
      };
    }
    
    if (!book) {
      throw new Error('Book not found');
    }

    // Get or create video record
    let record = await videoRepository.findByBookId(bookId);

    if (!record) {
      // Add to pg-boss queue (this also creates DB record with QUEUED status)
      const jobData = {
        bookId,
        title: book.title,
        author: book.author,
        summary: book.summary || '',
        trigger: isAdminRequest ? 'admin_seed' as const : 'user_request' as const,
        publisher: book.publisher || '',
        coverImageUrl: book.coverImageUrl || '',
        category: book.category || '',
      };

      const job = isAdminRequest
        ? await queueService.addAdminRequest(jobData)
        : await queueService.addUserRequest(jobData);

      if (job) {
        // Create notification
        await notificationRepository.create({
          type: isAdminRequest ? 'admin_video_queued' : 'video_queued',
          message: `Video generation queued for "${book.title}"`,
        });
      }

      // Fetch the created record
      record = await videoRepository.findByBookId(bookId);
      if (!record) {
        throw new Error('Failed to create video record');
      }

      return this.toStatusResponse(record);
    }

    // Handle different statuses
    switch (record.status) {
      case 'READY':
        // Increment request count and recalculate ranking
        await videoRepository.incrementRequestCount(bookId);
        record = await videoRepository.findByBookId(bookId) as any;
        const newScore = this.calculateRankingScore(record);
        record = await videoRepository.updateRankingScore(bookId, newScore);
        break;

      case 'QUEUED':
      case 'GENERATING':
        // Just return current status
        break;

      case 'NONE':
      case 'FAILED':
        // Add to pg-boss queue for regeneration
        const jobData2 = {
          bookId,
          title: book.title,
          author: book.author,
          summary: book.summary || '',
          trigger: isAdminRequest ? 'admin_seed' as const : 'user_request' as const,
          publisher: book.publisher || '',
          coverImageUrl: book.coverImageUrl || '',
          category: book.category || '',
        };

        const job2 = isAdminRequest
          ? await queueService.addAdminRequest(jobData2)
          : await queueService.addUserRequest(jobData2);

        if (job2) {
          await notificationRepository.create({
            type: isAdminRequest ? 'admin_video_queued' : 'video_queued',
            message: `Video generation queued for "${book.title}"`,
          });
        }

        // Fetch updated record
        record = await videoRepository.findByBookId(bookId);
        break;
    }

    return this.toStatusResponse(record);
  }

  /**
   * Update video expiration date (admin only)
   */
  async updateExpiration(bookId: string, expiresAt: Date): Promise<VideoStatusResponse> {
    const record = await videoRepository.findByBookId(bookId);
    if (!record) {
      throw new Error('Video record not found');
    }

    const updated = await videoRepository.update(bookId, { expiresAt });
    return this.toStatusResponse(updated);
  }

  /**
   * Update video status (admin only)
   */
  async updateStatus(bookId: string, status: VideoStatus): Promise<VideoStatusResponse> {
    const record = await videoRepository.findByBookId(bookId);
    if (!record) {
      throw new Error('Video record not found');
    }

    const updated = await videoRepository.update(bookId, { status });
    return this.toStatusResponse(updated);
  }

  /**
   * Get videos by status (admin)
   */
  async getVideosByStatus(status?: VideoStatus): Promise<VideoStatusResponse[]> {
    let records;
    if (status) {
      records = await videoRepository.findByStatus(status);
    } else {
      records = await videoRepository.findAll();
    }

    return records.map((r) => this.toStatusResponse(r));
  }

  /**
   * Get ranked videos (for recommendations)
   */
  async getRankedVideos(limit: number = 20): Promise<VideoStatusResponse[]> {
    const records = await videoRepository.findAll({
      take: limit,
      orderBy: { rankingScore: 'desc' },
    });

    return records
      .filter((r) => r.status === 'READY')
      .map((r) => this.toStatusResponse(r));
  }

  /**
   * Calculate ranking score based on request count and recency
   * Formula: rankingScore = requestCount + recencyBoost
   * where recencyBoost is higher when lastRequestedAt is recent
   */
  private calculateRankingScore(record: any): number {
    const { requestCount, lastRequestedAt } = record;

    if (!lastRequestedAt) {
      return requestCount;
    }

    // Calculate days since last request
    const now = Date.now();
    const lastRequest = new Date(lastRequestedAt).getTime();
    const daysSinceRequest = (now - lastRequest) / (1000 * 60 * 60 * 24);

    // Calculate recency boost (max 1.5x for requests within last 7 days)
    let recencyBoost = 0;
    if (daysSinceRequest <= 7) {
      // Linear decay from 1.5 to 0 over 7 days
      const recencyFactor = 1 - daysSinceRequest / 7;
      recencyBoost = requestCount * 1.5 * recencyFactor;
    }

    return requestCount + recencyBoost;
  }

  /**
   * Calculate default expiry date
   */
  private calculateExpiryDate(): Date {
    const days = config.video.defaultExpiryDays;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }

  /**
   * Convert VideoRecord to VideoStatusResponse
   */
  private toStatusResponse(record: any): VideoStatusResponse {
    return {
      bookId: record.bookId,
      status: record.status as VideoStatus,
      requestCount: record.requestCount,
      lastRequestedAt: record.lastRequestedAt,
      expiresAt: record.expiresAt,
      videoUrl: record.videoUrl,
      rankingScore: record.rankingScore,
      title: record.title || undefined,
      author: record.author || undefined,
    };
  }
}

export const videoService = new VideoService();
