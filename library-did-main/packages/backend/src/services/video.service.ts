import { videoRepository } from '../repositories/video.repository';
import { VideoStatus } from '../types';
import { notificationRepository } from '../repositories/notification.repository';
import { bookService } from './book.service';
import { VideoStatusResponse } from '../types';
import { config } from '../config';

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
   */
  async requestVideo(bookId: string, isAdminRequest: boolean = false): Promise<VideoStatusResponse> {
    // Verify book exists
    const book = await bookService.getBookDetail(bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    // Get or create video record
    let record = await videoRepository.findByBookId(bookId);

    if (!record) {
      // Create new record with QUEUED status
      const expiresAt = this.calculateExpiryDate();
      record = await videoRepository.create({
        bookId,
        status: 'QUEUED',
        expiresAt,
      });

      // Create notification
      await notificationRepository.create({
        type: isAdminRequest ? 'admin_video_queued' : 'video_queued',
        message: `Video generation queued for "${book.title}"`,
      });

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
        // Queue for generation
        const expiresAt = this.calculateExpiryDate();
        record = await videoRepository.update(bookId, {
          status: 'QUEUED',
          expiresAt,
          lastRequestedAt: new Date(),
          errorMessage: null,
        });

        await notificationRepository.create({
          type: isAdminRequest ? 'admin_video_queued' : 'video_queued',
          message: `Video generation queued for "${book.title}"`,
        });
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
    };
  }
}

export const videoService = new VideoService();
