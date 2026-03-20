import { FastifyRequest, FastifyReply } from 'fastify';
import { alpasService, isAlpasConnected } from '../services/alpas.service';
import { videoRepository } from '../repositories/video.repository';
import { recommendationRepository } from '../repositories/recommendation.repository';
import { queueService } from '../services/queue.service';
import { cacheManagerService } from '../services/cache-manager.service';
import { toPublicVideoUrl, toPublicSubtitleUrl } from '../utils/storage';
import { naverBookService } from '../services/naver-book.service';

// 네이버 표지 캐시 (title+author → imageUrl)
const coverCache = new Map<string, string | null>();
const COVER_TIMEOUT_MS = 5000; // 네이버 API 타임아웃 (5초)

/** 타임아웃 래퍼 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * 표지 URL이 없거나 picsum(더미)이면 네이버 API로 실제 표지를 가져옴
 */
async function enrichCoverUrl(
  title: string,
  author?: string,
  currentUrl?: string,
): Promise<string | undefined> {
  // 이미 실제 표지가 있으면 그대로
  if (currentUrl && !currentUrl.includes('picsum.photos')) {
    return currentUrl;
  }

  const cacheKey = `${title}|${author || ''}`;
  if (coverCache.has(cacheKey)) {
    return coverCache.get(cacheKey) || undefined;
  }

  try {
    const naverUrl = await withTimeout(
      naverBookService.searchCoverImage(title, author),
      COVER_TIMEOUT_MS,
      null,
    );
    coverCache.set(cacheKey, naverUrl);
    return naverUrl || undefined;
  } catch {
    coverCache.set(cacheKey, null);
    return undefined;
  }
}

/** 배열의 표지를 일괄 보강 (전체 10초 타임아웃) */
async function enrichBookCovers<T extends { title: string; author: string; coverImageUrl?: string }>(
  books: T[],
): Promise<T[]> {
  return withTimeout(
    Promise.all(
      books.map(async (book) => ({
        ...book,
        coverImageUrl: await enrichCoverUrl(book.title, book.author, book.coverImageUrl),
      })),
    ),
    10000,
    books, // 타임아웃 시 원본 그대로 반환
  );
}

/**
 * DID Controller
 *
 * Handles requests for the Digital Information Display (DID) touch interface.
 * All endpoints are public (no authentication required).
 * Optimized for touch screen kiosk usage in public library.
 */
export class DidController {
  /**
   * GET /api/did/alpas-status
   * ALPAS API 연결 상태 확인
   */
  async checkAlpasStatus(_request: FastifyRequest, reply: FastifyReply) {
    // 시작 시 테스트한 연결 상태 반환 (매번 API 호출 안 함)
    return reply.send({
      success: true,
      data: { connected: isAlpasConnected() },
    });
  }

  /**
   * GET /api/did/new-arrivals
   * Returns newly arrived books for DID display
   */
  async getNewArrivals(request: FastifyRequest, reply: FastifyReply) {
    try {
      const books = await alpasService.getNewArrivals();

      // Return minimal fields optimized for DID UI
      const didBooks = await enrichBookCovers(books.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverImageUrl: book.coverImageUrl,
        shelfCode: book.shelfCode,
        category: book.category,
      })));

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
      // DB recommendations 테이블에서 관리자가 등록한 추천도서 조회
      const recommendations = await recommendationRepository.getAll();

      const didBooks = await enrichBookCovers(recommendations.map((rec) => ({
        id: rec.bookId,
        title: rec.title,
        author: rec.author,
        coverImageUrl: rec.coverImageUrl || undefined,
        shelfCode: '',
        category: rec.category,
      })));

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

      // DB recommendations 테이블에서 해당 연령 그룹 조회
      // (관리자가 등록한 추천도서만 표시, mock fallback 없음)
      const recommendations = await recommendationRepository.getByAgeGroup(group.toLowerCase());

      const didBooks = await enrichBookCovers(recommendations.map((rec) => ({
        id: rec.bookId,
        title: rec.title,
        author: rec.author,
        coverImageUrl: rec.coverImageUrl || undefined,
        shelfCode: '',
        category: rec.category,
        hasVideo: false,
        publisher: rec.publisher,
        summary: rec.summary,
      })));

      // 각 추천도서의 영상 상태 확인
      const booksWithVideoStatus = await Promise.all(
        didBooks.map(async (book) => {
          const videoRecord = await videoRepository.findByBookId(book.id);
          return {
            ...book,
            hasVideo: videoRecord?.status === 'READY',
          };
        })
      );

      return reply.send({
        success: true,
        data: booksWithVideoStatus,
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
            coverImageUrl: await enrichCoverUrl(book.title, book.author, book.coverImageUrl),
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
            coverImageUrl: await enrichCoverUrl(videoRecord.title, videoRecord.author || '', videoRecord.coverImageUrl || undefined),
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

      // 각 영상에 책 정보 추가 + 표지 보강
      const videosWithBooks = await Promise.all(
        videos.map(async (video) => {
          const book = await alpasService.getBookDetail(video.bookId);
          const title = book?.title || video.title || '알 수 없음';
          const author = book?.author || video.author || '알 수 없음';
          return {
            bookId: video.bookId,
            title,
            author,
            coverImageUrl: await enrichCoverUrl(title, author, book?.coverImageUrl),
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
            coverImageUrl: await enrichCoverUrl(book.title, book.author, book.coverImageUrl),
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
