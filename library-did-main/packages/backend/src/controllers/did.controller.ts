import { FastifyRequest, FastifyReply } from 'fastify';
import { alpasService } from '../services/alpas.service';
import { videoRepository } from '../repositories/video.repository';
import { queueService } from '../services/queue.service';
import { cacheManagerService } from '../services/cache-manager.service';
import { toPublicVideoUrl, toPublicSubtitleUrl } from '../utils/storage';

/**
 * DID Controller
 *
 * Handles requests for the Digital Information Display (DID) touch interface.
 * All endpoints are public (no authentication required).
 * Optimized for touch screen kiosk usage in public library.
 */
export class DidController {
  /**
   * GET /api/did/new-arrivals
   * Returns newly arrived books for DID display
   */
  async getNewArrivals(request: FastifyRequest, reply: FastifyReply) {
    try {
      const books = await alpasService.getNewArrivals();

      // Return minimal fields optimized for DID UI
      const didBooks = books.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverImageUrl: book.coverImageUrl,
        shelfCode: book.shelfCode,
        category: book.category,
      }));

      return reply.send({
        success: true,
        data: didBooks,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to fetch new arrivals',
      });
    }
  }

  /**
   * GET /api/did/librarian-picks
   * Returns librarian recommended books for DID display
   */
  async getLibrarianPicks(request: FastifyRequest, reply: FastifyReply) {
    try {
      const books = await alpasService.getLibrarianPicks();

      // Return minimal fields optimized for DID UI
      const didBooks = books.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverImageUrl: book.coverImageUrl,
        shelfCode: book.shelfCode,
        category: book.category,
      }));

      return reply.send({
        success: true,
        data: didBooks,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to fetch librarian picks',
      });
    }
  }

  /**
   * GET /api/did/age/:group
   * Returns books filtered by age group
   * @param group - 'preschool' | 'elementary' | 'teen'
   * 
   * 영상이 준비된 책을 우선 표시하고, 나머지는 ALPAS 검색 결과로 채움
   */
  async getBooksByAge(
    request: FastifyRequest<{ Params: { group: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { group } = request.params;

      // Validate age group
      const validGroups = ['preschool', 'elementary', 'teen'];
      if (!validGroups.includes(group.toLowerCase())) {
        return reply.code(400).send({
          success: false,
          error: `Invalid age group. Must be one of: ${validGroups.join(', ')}`,
        });
      }

      // 1. 영상이 준비된 책 먼저 가져오기 (최대 9개)
      const readyVideos = await videoRepository.getReadyVideosOrderByRanking(9);
      const readyBookIds = new Set(readyVideos.map((v) => v.bookId));
      
      // 영상이 있는 책들의 상세 정보 가져오기
      const readyBooks = await Promise.all(
        readyVideos.map(async (video) => {
          const book = await alpasService.getBookDetail(video.bookId);
          if (book) {
            return {
              id: book.id,
              title: book.title,
              author: book.author,
              coverImageUrl: book.coverImageUrl,
              shelfCode: book.shelfCode,
              category: book.category,
              hasVideo: true,
            };
          }
          return null;
        })
      );
      const validReadyBooks = readyBooks.filter((b) => b !== null);

      // 2. ALPAS에서 연령별 도서 검색
      const alpasBooks = await alpasService.getBooksByAgeGroup(group);
      
      // 3. 영상이 있는 책 제외하고 나머지로 채우기
      const remainingSlots = 9 - validReadyBooks.length;
      const additionalBooks = alpasBooks
        .filter((book) => !readyBookIds.has(book.id))
        .slice(0, remainingSlots)
        .map((book) => ({
          id: book.id,
          title: book.title,
          author: book.author,
          coverImageUrl: book.coverImageUrl,
          shelfCode: book.shelfCode,
          category: book.category,
          hasVideo: false,
        }));

      // 4. 영상 있는 책 먼저, 그 다음 ALPAS 검색 결과
      const didBooks = [...validReadyBooks, ...additionalBooks];

      return reply.send({
        success: true,
        data: didBooks,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to fetch books by age',
      });
    }
  }

  /**
   * GET /api/did/books/:bookId
   * Returns detailed book information for DID detail view
   * 
   * 우선순위:
   * 1. ALPAS API에서 조회
   * 2. VideoRecord에 저장된 책 정보 사용 (ALPAS에서 못 찾을 경우)
   */
  async getBookDetail(
    request: FastifyRequest<{ Params: { bookId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { bookId } = request.params;
      
      // 1. ALPAS API에서 조회 시도
      const book = await alpasService.getBookDetail(bookId);

      if (book) {
        return reply.send({
          success: true,
          data: {
            id: book.id,
            title: book.title,
            author: book.author,
            publisher: book.publisher,
            publishedYear: book.publishedYear,
            isbn: book.isbn,
            summary: book.summary,
            shelfCode: book.shelfCode,
            callNumber: book.callNumber,
            category: book.category,
            coverImageUrl: book.coverImageUrl,
            isAvailable: book.isAvailable,
          },
        });
      }

      // 2. VideoRecord에서 책 정보 조회 (ALPAS에서 못 찾은 경우)
      const videoRecord = await videoRepository.findByBookId(bookId);
      if (videoRecord && videoRecord.title) {
        console.log(`[DID getBookDetail] Using book info from VideoRecord: ${videoRecord.title}`);
        return reply.send({
          success: true,
          data: {
            id: bookId,
            title: videoRecord.title,
            author: videoRecord.author || '저자 미상',
            publisher: videoRecord.publisher || '',
            summary: videoRecord.summary || '',
            category: videoRecord.category || '',
            coverImageUrl: videoRecord.coverImageUrl || `https://picsum.photos/seed/${bookId}/300/400`,
            isAvailable: true,
          },
        });
      }

      return reply.code(404).send({
        success: false,
        error: 'Book not found',
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to fetch book detail',
      });
    }
  }

  // =====================
  // Video Endpoints
  // =====================

  /**
   * GET /api/did/books/:bookId/video
   * 책의 영상 상태 및 URL 조회
   * - READY: 영상 URL 반환 (바로 시청 가능)
   * - QUEUED/GENERATING: 생성 중 상태 반환
   * - NONE/FAILED: 영상 없음 상태 반환
   */
  async getVideoStatus(
    request: FastifyRequest<{ Params: { bookId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { bookId } = request.params;

      const record = await videoRepository.findByBookId(bookId);

      if (!record) {
        return reply.send({
          success: true,
          data: {
            bookId,
            status: 'NONE',
            videoUrl: null,
            message: '영상이 아직 생성되지 않았습니다.',
          },
        });
      }

      // READY 상태면 조회수 증가 및 랭킹 업데이트
      if (record.status === 'READY' && record.videoUrl) {
        await cacheManagerService.touchVideo(bookId);
      }

      return reply.send({
        success: true,
        data: {
          bookId: record.bookId,
          status: record.status,
          videoUrl: record.status === 'READY' ? toPublicVideoUrl(record.videoUrl) : null,
          subtitleUrl: record.status === 'READY' && record.subtitleUrl ? toPublicSubtitleUrl(record.subtitleUrl) : null,
          message: this.getStatusMessage(record.status),
        },
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to fetch video status',
      });
    }
  }

  /**
   * POST /api/did/books/:bookId/video/request
   * 영상 생성 요청 (사용자가 직접 요청)
   * - 이미 READY: 바로 영상 URL 반환
   * - QUEUED/GENERATING: 이미 진행 중 상태 반환
   * - NONE/FAILED: 큐에 추가하고 QUEUED 상태 반환
   * 
   * Body (optional): { title, author, summary } - 프론트엔드에서 책 정보를 함께 전달
   */
  async requestVideo(
    request: FastifyRequest<{
      Params: { bookId: string };
      Body?: { title?: string; author?: string; summary?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { bookId } = request.params;
      const bodyInfo = request.body || {};

      // 1. 책 정보 조회 (우선순위: body > cache > API search)
      let book = await alpasService.getBookDetail(bookId);
      
      // Body에서 책 정보가 전달되었으면 사용 (캐시 미스 대비)
      if (!book && bodyInfo.title) {
        console.log(`[DID requestVideo] Using book info from request body: ${bodyInfo.title}`);
        book = {
          id: bookId,
          title: bodyInfo.title,
          author: bodyInfo.author || '저자 미상',
          summary: bodyInfo.summary || '',
          publisher: '',
          publishedYear: 0,
          isbn: '',
          callNumber: '',
          registrationNumber: '',
          shelfCode: '',
          isAvailable: true,
          category: '',
        };
      }
      
      if (!book) {
        // 캐시에 없으면 검색으로 시도
        console.log(`[DID requestVideo] Book not found in cache, trying search for: ${bookId}`);
        const searchResults = await alpasService.searchBooks(bookId);
        if (searchResults.length > 0) {
          book = searchResults[0];
          console.log(`[DID requestVideo] Found via search: ${book.title}`);
        }
      }
      
      if (!book) {
        // 그래도 없으면 에러 반환 (fallback 제목으로 영상 생성하면 의미 없음)
        console.log(`[DID requestVideo] Book not found: ${bookId}`);
        return reply.code(404).send({
          success: false,
          error: '책 정보를 찾을 수 없습니다. 검색 결과에서 책을 선택해주세요.',
        });
      }
      
      console.log(`[DID requestVideo] Using book: ${book.title} by ${book.author}`);

      // 2. 기존 영상 상태 확인
      const existingRecord = await videoRepository.findByBookId(bookId);

      // 이미 READY 상태면 바로 반환
      if (existingRecord?.status === 'READY' && existingRecord.videoUrl) {
        await cacheManagerService.touchVideo(bookId);
        return reply.send({
          success: true,
          data: {
            bookId,
            status: 'READY',
            videoUrl: toPublicVideoUrl(existingRecord.videoUrl),
            subtitleUrl: toPublicSubtitleUrl(existingRecord.subtitleUrl),
            message: '영상이 준비되어 있습니다.',
          },
        });
      }

      // 이미 QUEUED/GENERATING 상태면 현재 상태 반환
      if (existingRecord?.status === 'QUEUED' || existingRecord?.status === 'GENERATING') {
        return reply.send({
          success: true,
          data: {
            bookId,
            status: existingRecord.status,
            videoUrl: null,
            message: this.getStatusMessage(existingRecord.status),
          },
        });
      }

      // 3. 큐에 추가 (사용자 요청 - 높은 우선순위)
      // 책 정보도 함께 전달하여 VideoRecord에 저장
      const job = await queueService.addUserRequest({
        bookId: book.id,
        title: book.title,
        author: book.author,
        summary: book.summary || '',
        trigger: 'user_request',
        publisher: book.publisher,
        coverImageUrl: book.coverImageUrl,
        category: book.category,
      });

      if (job) {
        return reply.send({
          success: true,
          data: {
            bookId,
            status: 'QUEUED',
            videoUrl: null,
            message: '영상 생성 요청이 접수되었습니다. 잠시 후 다시 확인해주세요.',
            queuePosition: await this.getQueuePosition(bookId),
          },
        });
      } else {
        // 이미 큐에 있는 경우
        return reply.send({
          success: true,
          data: {
            bookId,
            status: 'QUEUED',
            videoUrl: null,
            message: '이미 영상 생성이 진행 중입니다.',
          },
        });
      }
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to request video',
      });
    }
  }

  /**
   * GET /api/did/videos/popular
   * 인기 영상 목록 (랭킹 기반)
   */
  async getPopularVideos(
    request: FastifyRequest<{ Querystring: { limit?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;
      const videos = await videoRepository.getReadyVideosOrderByRanking(limit);

      // 각 영상에 책 정보 추가
      const videosWithBooks = await Promise.all(
        videos.map(async (video) => {
          const book = await alpasService.getBookDetail(video.bookId);
          return {
            bookId: video.bookId,
            title: book?.title || '알 수 없음',
            author: book?.author || '알 수 없음',
            coverImageUrl: book?.coverImageUrl,
            videoUrl: toPublicVideoUrl(video.videoUrl),
            requestCount: video.requestCount,
            rankingScore: video.rankingScore,
          };
        })
      );

      return reply.send({
        success: true,
        data: videosWithBooks,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to fetch popular videos',
      });
    }
  }

  /**
   * GET /api/did/search
   * 책 검색 (영상 상태 포함)
   */
  async searchBooks(
    request: FastifyRequest<{ Querystring: { q: string; limit?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { q, limit } = request.query;
      console.log('[DID Search] Query:', q, 'Limit:', limit);

      if (!q || q.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: '검색어를 입력해주세요.',
        });
      }

      const maxResults = limit ? parseInt(limit, 10) : 20;
      console.log('[DID Search] Calling alpasService.searchBooks...');
      const books = await alpasService.searchBooks(q);
      console.log('[DID Search] Got', books.length, 'books');
      const limitedBooks = books.slice(0, maxResults);

      // 각 책에 영상 상태 추가
      const booksWithVideoStatus = await Promise.all(
        limitedBooks.map(async (book) => {
          const videoRecord = await videoRepository.findByBookId(book.id);
          return {
            id: book.id,
            title: book.title,
            author: book.author,
            publisher: book.publisher,
            coverImageUrl: book.coverImageUrl,
            shelfCode: book.shelfCode,
            category: book.category,
            videoStatus: videoRecord?.status || 'NONE',
            hasVideo: videoRecord?.status === 'READY',
          };
        })
      );

      return reply.send({
        success: true,
        data: booksWithVideoStatus,
        total: booksWithVideoStatus.length,
      });
    } catch (error: any) {
      console.error('[DID Search] Error:', error.message, error.stack);
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to search books',
      });
    }
  }

  // =====================
  // Helper Methods
  // =====================

  private getStatusMessage(status: string): string {
    switch (status) {
      case 'READY':
        return '영상이 준비되어 있습니다.';
      case 'QUEUED':
        return '영상 생성 대기 중입니다. 잠시 후 다시 확인해주세요.';
      case 'GENERATING':
        return '영상을 생성하고 있습니다. 잠시 후 다시 확인해주세요.';
      case 'FAILED':
        return '영상 생성에 실패했습니다. 다시 요청해주세요.';
      default:
        return '영상이 아직 생성되지 않았습니다.';
    }
  }

  private async getQueuePosition(bookId: string): Promise<number | null> {
    try {
      const waitingJobs = await queueService.getWaitingJobs(100);
      const index = waitingJobs.findIndex((job) => job.bookId === bookId);
      return index >= 0 ? index + 1 : null;
    } catch {
      return null;
    }
  }
}

export const didController = new DidController();
