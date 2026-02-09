import { videoService } from '../services/video.service';
import { bookService } from '../services/book.service';
import { db } from '../db';
import { Book, VideoStatus } from '@smart-did/shared';

describe('VideoService', () => {
  const testBook: Book = {
    bookId: 'TEST-001',
    title: 'Test Book',
    author: 'Test Author',
    summary: 'Test summary for a children book',
    genre: 'Test Genre',
    shelfCode: 'T-01-01',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    await db.clear();
    await db.createBook(testBook);
  });

  describe('getVideoRecord', () => {
    it('should create new record if not exists', async () => {
      const record = await videoService.getVideoRecord('TEST-001');

      expect(record).toBeDefined();
      expect(record.bookId).toBe('TEST-001');
      expect(record.status).toBe(VideoStatus.NONE);
      expect(record.requestCount).toBe(0);
    });

    it('should return existing record', async () => {
      const first = await videoService.getVideoRecord('TEST-001');
      const second = await videoService.getVideoRecord('TEST-001');

      expect(first.bookId).toBe(second.bookId);
      expect(first.createdAt).toEqual(second.createdAt);
    });
  });

  describe('requestVideo', () => {
    it('should queue video generation for NONE status', async () => {
      const result = await videoService.requestVideo('TEST-001');

      expect(result.status).toBe(VideoStatus.QUEUED);
      expect(result.message).toBe('Video generation queued');
    });

    it('should return existing video for READY status', async () => {
      await db.createVideoRecord({
        bookId: 'TEST-001',
        status: VideoStatus.READY,
        videoUrl: '/videos/test.mp4',
        subtitleUrl: '/videos/test.vtt',
        requestCount: 0,
        retryCount: 0,
        rankingScore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await videoService.requestVideo('TEST-001');

      expect(result.status).toBe(VideoStatus.READY);
      expect(result.message).toBe('Video is ready');
    });

    it('should throw error for non-existent book', async () => {
      await expect(
        videoService.requestVideo('INVALID-BOOK')
      ).rejects.toThrow('Book not found');
    });
  });

  describe('markVideoReady', () => {
    it('should update video record to READY status', async () => {
      await videoService.getVideoRecord('TEST-001');

      await videoService.markVideoReady(
        'TEST-001',
        '/videos/test.mp4',
        '/videos/test.vtt'
      );

      const record = await db.getVideoRecord('TEST-001');
      expect(record?.status).toBe(VideoStatus.READY);
      expect(record?.videoUrl).toBe('/videos/test.mp4');
      expect(record?.subtitleUrl).toBe('/videos/test.vtt');
      expect(record?.expiresAt).toBeDefined();
    });
  });

  describe('markVideoFailed', () => {
    it('should update video record to FAILED status', async () => {
      await videoService.getVideoRecord('TEST-001');

      await videoService.markVideoFailed('TEST-001', 'Test error message');

      const record = await db.getVideoRecord('TEST-001');
      expect(record?.status).toBe(VideoStatus.FAILED);
      expect(record?.errorMessage).toBe('Test error message');
    });
  });
});
