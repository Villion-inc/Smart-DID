import { FastifyRequest, FastifyReply } from 'fastify';
import { bookService } from '../services/book.service';
import { videoService } from '../services/video.service';
import { notificationService } from '../services/notification.service';
import { queueService } from '../services/queue.service';
import { cacheManagerService } from '../services/cache-manager.service';
import { bestsellerSeedService } from '../services/bestseller-seed.service';
import { recommendationRepository } from '../repositories/recommendation.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { naverBookService } from '../services/naver-book.service';
import { data4libraryService } from '../services/data4library.service';
import { VideoUpdateInput, VideoStatusQueryInput } from '../schemas/video.schema';
import { VideoStatus } from '../types';

export class AdminController {
  // Recommendation endpoints
  async getNewArrivals(request: FastifyRequest, reply: FastifyReply) {
    const books = await bookService.getNewArrivals();
    return reply.send({
      success: true,
      data: books,
    });
  }

  async getLibrarianPicks(request: FastifyRequest, reply: FastifyReply) {
    const books = await bookService.getLibrarianPicks();
    return reply.send({
      success: true,
      data: books,
    });
  }

  // =====================
  // 추천도서 관리 (Recommendations CRUD)
  // =====================

  async getRecommendations(request: FastifyRequest, reply: FastifyReply) {
    const recommendations = await recommendationRepository.getAll();
    return reply.send({
      success: true,
      data: recommendations,
    });
  }

  async addRecommendation(
    request: FastifyRequest<{
      Body: {
        bookId?: string;
        ageGroup: string;
        title: string;
        author: string;
        publisher?: string;
        summary?: string;
        coverImageUrl?: string;
        category?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { bookId, ageGroup, title, author, publisher, summary, coverImageUrl, category } = request.body;

    // Validate age group
    const validGroups = ['preschool', 'elementary', 'teen'];
    if (!validGroups.includes(ageGroup)) {
      return reply.code(400).send({
        success: false,
        error: `Invalid age group. Must be one of: ${validGroups.join(', ')}`,
      });
    }

    if (!title || !author) {
      return reply.code(400).send({
        success: false,
        error: '제목과 저자는 필수입니다.',
      });
    }

    try {
      // 표지 URL이 없으면 정보나루에서 자동 조회
      let resolvedCoverUrl = coverImageUrl;
      if (!resolvedCoverUrl) {
        try {
          const results = await data4libraryService.searchBooks(title, 1);
          if (results.length > 0 && results[0].bookImageURL) {
            resolvedCoverUrl = results[0].bookImageURL;
          }
        } catch { /* ignore */ }
      }

      const recommendation = await recommendationRepository.create({
        bookId,
        ageGroup,
        title,
        author,
        publisher,
        summary,
        coverImageUrl: resolvedCoverUrl,
        category,
      });

      // 자동 영상 생성 요청
      await queueService.addAdminRequest({
        bookId: recommendation.bookId,
        title: recommendation.title,
        author: recommendation.author,
        summary: recommendation.summary || '',
        trigger: 'admin_seed',
        publisher: recommendation.publisher,
        coverImageUrl: recommendation.coverImageUrl || undefined,
        category: recommendation.category,
      });

      return reply.send({
        success: true,
        data: recommendation,
        message: '추천도서가 등록되고 영상 생성이 요청되었습니다.',
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || '추천도서 등록 실패',
      });
    }
  }

  async deleteRecommendation(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;

    try {
      const deleted = await recommendationRepository.remove(id);
      return reply.send({
        success: true,
        data: deleted,
        message: '추천도서가 삭제되었습니다.',
      });
    } catch (error: any) {
      return reply.code(404).send({
        success: false,
        error: '추천도서를 찾을 수 없습니다.',
      });
    }
  }

  // Video management
  async requestVideoGeneration(
    request: FastifyRequest<{
      Params: { bookId: string };
      Body?: { title?: string; author?: string };
    }>,
    reply: FastifyReply
  ) {
    const { bookId } = request.params;
    const bookInfo = request.body || {};

    try {
      const result = await videoService.requestVideo(bookId, true, bookInfo);
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to request video generation',
      });
    }
  }

  async getVideos(
    request: FastifyRequest<{ Querystring: VideoStatusQueryInput }>,
    reply: FastifyReply
  ) {
    const { status } = request.query;
    const videos = await videoService.getVideosByStatus(status);

    return reply.send({
      success: true,
      data: videos,
    });
  }

  async updateVideo(
    request: FastifyRequest<{
      Params: { bookId: string };
      Body: VideoUpdateInput;
    }>,
    reply: FastifyReply
  ) {
    const { bookId } = request.params;
    const updates = request.body;

    try {
      let result;

      if (updates.expiresAt) {
        result = await videoService.updateExpiration(bookId, new Date(updates.expiresAt));
      } else if (updates.status) {
        result = await videoService.updateStatus(bookId, updates.status as VideoStatus);
      } else {
        return reply.code(400).send({
          success: false,
          error: 'No valid update fields provided',
        });
      }

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to update video',
      });
    }
  }

  // Notifications
  async getNotifications(
    request: FastifyRequest<{
      Querystring: { take?: number; skip?: number; isRead?: string };
    }>,
    reply: FastifyReply
  ) {
    const { take, skip, isRead } = request.query;
    const notifications = await notificationService.getNotifications({
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
    });

    const unreadCount = await notificationService.getUnreadCount();

    return reply.send({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  }

  async markNotificationAsRead(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;

    try {
      const notification = await notificationService.markAsRead(id);
      return reply.send({
        success: true,
        data: notification,
      });
    } catch (error: any) {
      return reply.code(404).send({
        success: false,
        error: 'Notification not found',
      });
    }
  }

  async markAllNotificationsAsRead(request: FastifyRequest, reply: FastifyReply) {
    const result = await notificationService.markAllAsRead();
    return reply.send({
      success: true,
      data: result,
    });
  }

  // =====================
  // Bestseller Seed
  // =====================

  /**
   * 베스트셀러 100권 사전 영상 생성 시작
   */
  async seedBestsellers(
    request: FastifyRequest<{ Querystring: { limit?: string } }>,
    reply: FastifyReply
  ) {
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;

    try {
      const result = await bestsellerSeedService.seedBestsellers(limit);
      return reply.send({
        success: true,
        message: `베스트셀러 시드 시작: ${result.requested}권 요청됨`,
        data: result,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || '베스트셀러 시드 실패',
      });
    }
  }

  /**
   * 연령대별 추천 도서 시드
   */
  async seedByAgeGroup(
    request: FastifyRequest<{
      Params: { ageGroup: 'preschool' | 'elementary' | 'teen' };
      Querystring: { limit?: string };
    }>,
    reply: FastifyReply
  ) {
    const { ageGroup } = request.params;
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 30;

    try {
      const result = await bestsellerSeedService.seedByAgeGroup(ageGroup, limit);
      return reply.send({
        success: true,
        message: `${ageGroup} 도서 시드 시작: ${result.requested}권 요청됨`,
        data: result,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || '연령대별 시드 실패',
      });
    }
  }

  /**
   * 시드 상태 조회
   */
  async getSeedStatus(request: FastifyRequest, reply: FastifyReply) {
    const status = await bestsellerSeedService.getSeedStatus();
    return reply.send({
      success: true,
      data: status,
    });
  }

  // =====================
  // Queue Management
  // =====================

  /**
   * 큐 상태 조회
   */
  async getQueueStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await queueService.getQueueStats();
    return reply.send({
      success: true,
      data: stats,
    });
  }

  /**
   * 대기 중인 작업 목록 조회
   */
  async getWaitingJobs(
    request: FastifyRequest<{ Querystring: { limit?: string } }>,
    reply: FastifyReply
  ) {
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;
    const jobs = await queueService.getWaitingJobs(limit);
    return reply.send({
      success: true,
      data: jobs,
    });
  }

  /**
   * 특정 작업 취소
   */
  async cancelJob(
    request: FastifyRequest<{ Params: { bookId: string } }>,
    reply: FastifyReply
  ) {
    const { bookId } = request.params;
    const cancelled = await queueService.cancelJob(bookId);

    if (cancelled) {
      return reply.send({
        success: true,
        message: `Book ${bookId} 작업이 취소되었습니다.`,
      });
    } else {
      return reply.code(404).send({
        success: false,
        error: '대기 중인 작업을 찾을 수 없습니다.',
      });
    }
  }

  /**
   * 실패한 작업 재시도
   */
  async retryFailedJob(
    request: FastifyRequest<{ Params: { bookId: string } }>,
    reply: FastifyReply
  ) {
    const { bookId } = request.params;
    const retried = await queueService.retryFailedJob(bookId);

    if (retried) {
      return reply.send({
        success: true,
        message: `Book ${bookId} 작업이 재시도됩니다.`,
      });
    } else {
      return reply.code(404).send({
        success: false,
        error: '실패한 작업을 찾을 수 없습니다.',
      });
    }
  }

  // =====================
  // Cache Management
  // =====================

  /**
   * 캐시 통계 조회
   */
  async getCacheStats(request: FastifyRequest, reply: FastifyReply) {
    const stats = await cacheManagerService.getCacheStats();
    return reply.send({
      success: true,
      data: stats,
    });
  }

  /**
   * 오래된 영상 정리 (LRU 기반)
   */
  async cleanupStaleVideos(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await cacheManagerService.cleanupStaleVideos();
      return reply.send({
        success: true,
        message: `${result.deleted}개 영상이 정리되었습니다.`,
        data: result,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || '캐시 정리 실패',
      });
    }
  }

  // =====================
  // Dashboard Stats
  // =====================

  // =====================
  // 네이버 책 검색 (표지 이미지)
  // =====================

  /**
   * GET /api/admin/books/search-cover?title=...&author=...
   * 정보나루 → 네이버 순으로 표지 이미지 URL 조회
   */
  async searchBookCover(
    request: FastifyRequest<{ Querystring: { title: string; author?: string; publisher?: string } }>,
    reply: FastifyReply
  ) {
    const { title, author, publisher } = request.query;

    if (!title) {
      return reply.code(400).send({
        success: false,
        error: '제목을 입력해주세요.',
      });
    }

    // 1차: 정보나루에서 검색
    try {
      const results = await data4libraryService.searchBooks(title, 5);
      if (results.length > 0 && results[0].bookImageURL) {
        return reply.send({
          success: true,
          data: { coverImageUrl: results[0].bookImageURL },
        });
      }
    } catch { /* fallback to naver */ }

    // 2차: 네이버 fallback
    const coverImageUrl = naverBookService.isConfigured()
      ? await naverBookService.searchCoverImage(title, author, publisher)
      : null;
    return reply.send({
      success: true,
      data: { coverImageUrl },
    });
  }

  /**
   * 대시보드 통계 조회
   */
  async getDashboardStats(request: FastifyRequest, reply: FastifyReply) {
    const [seedStatus, queueStats, cacheStats] = await Promise.all([
      bestsellerSeedService.getSeedStatus(),
      queueService.getQueueStats(),
      cacheManagerService.getCacheStats(),
    ]);

    return reply.send({
      success: true,
      data: {
        videos: seedStatus,
        queue: queueStats,
        cache: cacheStats,
      },
    });
  }
  // =====================
  // Site Settings
  // =====================

  async getSettings(_request: FastifyRequest, reply: FastifyReply) {
    const settings = await settingsRepository.getAll();
    return reply.send({ success: true, data: settings });
  }

  async updateSettings(
    request: FastifyRequest<{ Body: Record<string, string> }>,
    reply: FastifyReply,
  ) {
    const entries = Object.entries(request.body);
    for (const [key, value] of entries) {
      await settingsRepository.set(key, value);
    }
    return reply.send({ success: true, message: '설정이 저장되었습니다.' });
  }
}

export const adminController = new AdminController();
