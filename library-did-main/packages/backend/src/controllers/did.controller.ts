import { FastifyRequest, FastifyReply } from 'fastify';
import { alpasService, isAlpasConnected } from '../services/alpas.service';
import { videoRepository } from '../repositories/video.repository';
import { recommendationRepository } from '../repositories/recommendation.repository';
import { queueService } from '../services/queue.service';
import { cacheManagerService } from '../services/cache-manager.service';
import { toPublicVideoUrl, toPublicSubtitleUrl } from '../utils/storage';
import { naverBookService } from '../services/naver-book.service';
import { data4libraryService } from '../services/data4library.service';

import { config } from '../config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 알라딘 줄거리 캐시 (title → description)
const aladinDescCache = new Map<string, string | null>();

/**
 * 알라딘 Open API에서 줄거리 가져오기 (검색 → 상세)
 */
async function fetchAladinDescription(title: string, author?: string): Promise<string | null> {
  const ttbKey = config.aladin?.ttbKey;
  if (!ttbKey) return null;

  const cacheKey = `${title}|${author || ''}`;
  const cached = aladinDescCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const query = author ? `${title} ${author}` : title;
    const searchUrl = `http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ttbKey}&Query=${encodeURIComponent(query)}&MaxResults=3&output=js&Version=20131101`;
    const searchResp = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    let searchText = (await searchResp.text()).trim();
    if (searchText.startsWith(';')) searchText = searchText.substring(1);
    const searchData = JSON.parse(searchText);
    const items = searchData?.item;
    if (!items || items.length === 0) {
      aladinDescCache.set(cacheKey, null);
      return null;
    }

    const cleanTitle = title.replace(/\s/g, '').toLowerCase();
    const best = items.find((it: any) => {
      const t = (it.title || '').replace(/<[^>]+>/g, '').replace(/\s/g, '').toLowerCase();
      return t.includes(cleanTitle) || cleanTitle.includes(t);
    }) || items[0];
    const itemId = best.itemId;
    const detailUrl = `http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey=${ttbKey}&itemIdType=ItemId&ItemId=${itemId}&output=js&Version=20131101&OptResult=fulldescription`;
    const detailResp = await fetch(detailUrl, { signal: AbortSignal.timeout(5000) });
    let detailText = (await detailResp.text()).trim();
    if (detailText.startsWith(';')) detailText = detailText.substring(1);
    const detailData = JSON.parse(detailText);
    const detailItems = detailData?.item;
    if (!detailItems || detailItems.length === 0) {
      aladinDescCache.set(cacheKey, null);
      return null;
    }

    const item = detailItems[0];
    const desc = (item.fullDescription || item.fullDescription2 || item.description || '')
      .replace(/<[^>]+>/g, '')
      .replace(/^["'>}\]]+/, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (desc && desc.length > 30) {
      aladinDescCache.set(cacheKey, desc);
      return desc;
    }

    aladinDescCache.set(cacheKey, null);
    return null;
  } catch (err: any) {
    console.error(`[Aladin] Fetch failed for "${title}": ${err.message}`);
    aladinDescCache.set(cacheKey, null);
    return null;
  }
}

// 리라이트 캐시
const rewriteCache = new Map<string, string>();

/**
 * Gemini로 알라딘 줄거리를 가볍게 리라이트 (내용 동일, 표현만 변경)
 */
async function rewriteDescription(original: string, bookTitle: string): Promise<string> {
  if (!original || original.length < 30) return original;

  const cacheKey = `${bookTitle}|${original.substring(0, 50)}`;
  const cached = rewriteCache.get(cacheKey);
  if (cached) return cached;

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return original;

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text:
        `다음 책 소개 글을 리라이트해주세요.

규칙:
- 원문의 핵심 정보(인물명, 줄거리, 주제, 수상 이력 등)는 반드시 유지
- 문장 구조를 재배치하고, 동의어로 표현을 교체
- 수동태↔능동태 변환, 문장 합치기/나누기를 적극 활용
- 원문에 없는 내용은 추가하지 말 것
- 원문 길이와 비슷하게 유지 (±30%)
- 『』 같은 책 제목 표기는 유지
- 도서관에서 이용자에게 보여줄 자연스러운 소개글 느낌으로
- 존댓말(~합니다, ~입니다) 톤 유지
- 리라이트한 텍스트만 반환

책 제목: ${bookTitle}
원문:
${original}` }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 2000 },
    });

    const rewritten = result.response.text().trim();
    if (rewritten && rewritten.length > 20) {
      rewriteCache.set(cacheKey, rewritten);
      console.log(`[Rewrite] "${bookTitle}": ${original.length}자 → ${rewritten.length}자`);
      return rewritten;
    }
  } catch (err: any) {
    console.error(`[Rewrite] Failed for "${bookTitle}": ${err.message}`);
  }

  return original;
}

// 네이버 표지 캐시 (title+author → imageUrl)
const coverCache = new Map<string, string | null>();
const COVER_TIMEOUT_MS = 5000; // 네이버 API 타임아웃 (5초)
let coverCacheWarmed = false;

// 연령별 인기도서 + ALPAS 필터 결과 캐시 (1시간)
const ageFilterCache = new Map<string, { data: any[]; timestamp: number }>();

/**
 * 서버 시작 시 신착도서 표지를 미리 캐시 (백그라운드)
 * 3개씩 배치 처리 + 딜레이로 네이버 API 속도 제한 준수
 */
export async function warmCoverCache(): Promise<void> {
  if (coverCacheWarmed) return;
  coverCacheWarmed = true;

  try {
    console.log('[Cover] Warming cache: fetching new arrivals...');
    const books = await alpasService.getNewArrivals();
    console.log(`[Cover] Warming cache: ${books.length} books to process`);

    // 1개씩 순차 처리 (정보나루 ISBN 기반)
    let ok = 0;
    for (const book of books) {
      await enrichCoverUrl(book.title, book.author, book.coverImageUrl, book.isbn);
      ok++;
    }

    const cached = [...coverCache.values()].filter(v => v !== null).length;
    console.log(`[Cover] Cache warmed: ${cached}/${ok} covers found`);
  } catch (err: any) {
    console.error(`[Cover] Cache warming failed: ${err.message}`);
  }
}

/** 타임아웃 래퍼 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/**
 * 네이버 검색용 제목 클리닝
 * 괄호, 시리즈 번호, 부제, 저자명 접미사 등 제거
 */
function cleanTitleForSearch(title: string): string {
  return title
    .replace(/\(.*?\)/g, '')          // (괄호 내용) 제거
    .replace(/\[.*?\]/g, '')          // [괄호 내용] 제거
    .replace(/[=＝].*/g, '')          // = 이후 영문 부제 제거
    .replace(/:\s*.{15,}/g, '')       // : 이후 긴 부제 제거 (15자 이상)
    .replace(/\.\s*\d+.*/g, '')       // . 시리즈 번호 제거 (예: ". 9, 에너지")
    .replace(/\d+\.\d+$/g, '')        // 끝에 붙은 버전 번호 (예: "2.0")
    .trim();
}

/**
 * 표지 URL이 없으면 정보나루 API(ISBN)로 표지를 가져옴
 * @param isbn - 13자리 ISBN (ALPAS에서 제공)
 */
async function enrichCoverUrl(
  title: string,
  author?: string,
  currentUrl?: string,
  isbn?: string,
): Promise<string | undefined> {
  // 이미 실제 표지가 있으면 그대로
  if (currentUrl && !currentUrl.includes('picsum.photos') && currentUrl.length > 0) {
    return currentUrl;
  }

  const cacheKey = isbn || `${title}|${author || ''}`;
  if (coverCache.has(cacheKey)) {
    return coverCache.get(cacheKey) || currentUrl;
  }

  // 1차: 정보나루 ISBN 조회
  if (isbn) {
    try {
      const coverUrl = await withTimeout(
        data4libraryService.getCoverImage(isbn),
        COVER_TIMEOUT_MS,
        null,
      );
      if (coverUrl) {
        console.log(`[Cover] OK (정보나루): "${title}" → ${coverUrl.substring(0, 50)}...`);
        coverCache.set(cacheKey, coverUrl);
        return coverUrl;
      }
    } catch { /* ignore */ }
  }

  // 2차: 정보나루 검색 (ISBN 없을 때)
  if (!isbn) {
    try {
      const cleaned = cleanTitleForSearch(title);
      const searchTitle = cleaned || title;
      const results = await withTimeout(
        data4libraryService.searchBooks(searchTitle, 1),
        COVER_TIMEOUT_MS,
        [] as any,
      );
      if (results && results.length > 0 && results[0].bookImageURL) {
        const coverUrl = results[0].bookImageURL;
        console.log(`[Cover] OK (정보나루 검색): "${searchTitle}" → ${coverUrl.substring(0, 50)}...`);
        coverCache.set(cacheKey, coverUrl);
        return coverUrl;
      }
    } catch { /* ignore */ }
  }

  // 3차: 네이버 fallback
  try {
    const cleaned = cleanTitleForSearch(title);
    const searchTitle = cleaned || title;
    const naverUrl = await withTimeout(
      naverBookService.searchCoverImage(searchTitle),
      COVER_TIMEOUT_MS,
      null,
    );
    if (naverUrl) {
      console.log(`[Cover] OK (네이버 fallback): "${searchTitle}" → ${naverUrl.substring(0, 50)}...`);
      coverCache.set(cacheKey, naverUrl);
      return naverUrl;
    }
  } catch { /* ignore */ }

  console.log(`[Cover] NOT FOUND: "${title}"`);
  coverCache.set(cacheKey, null);
  return currentUrl;
}

/** 배열의 표지를 일괄 보강 (정보나루 ISBN 기반) */
async function enrichBookCovers<T extends { title: string; author: string; coverImageUrl?: string; isbn?: string }>(
  books: T[],
): Promise<T[]> {
  return Promise.all(
    books.map(async (book) => ({
      ...book,
      coverImageUrl: await enrichCoverUrl(book.title, book.author, book.coverImageUrl, book.isbn),
    })),
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

      // 1층 신착도서 코너 우선 정렬
      const sorted = [...books].sort((a, b) => {
        const aFirst = a.shelfCode?.includes('1층') ? 0 : 1;
        const bFirst = b.shelfCode?.includes('1층') ? 0 : 1;
        return aFirst - bFirst;
      });

      // Return minimal fields optimized for DID UI
      const didBooks = await enrichBookCovers(sorted.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverImageUrl: book.coverImageUrl,
        shelfCode: book.shelfCode,
        category: book.category,
        isbn: book.isbn,
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
   * @param group - 'preschool' | 'elementary' | 'teen' | 'librarian'
   *
   * - preschool/elementary/teen: 정보나루 인기대출도서 API
   * - librarian: DB recommendations (관리자 수동 등록)
   */
  async getBooksByAge(
    request: FastifyRequest<{ Params: { group: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { group } = request.params;

      const validGroups = ['preschool', 'elementary', 'teen', 'librarian'];
      if (!validGroups.includes(group.toLowerCase())) {
        return reply.code(400).send({
          success: false,
          error: `Invalid age group. Must be one of: ${validGroups.join(', ')}`,
        });
      }

      // 사서추천: 기존 DB recommendations + 대출 가능 필터
      if (group.toLowerCase() === 'librarian') {
        const recommendations = await recommendationRepository.getAll();

        let filteredRecs = recommendations;
        if (isAlpasConnected()) {
          // 대출 가능한 책만 표시
          const checks = await Promise.all(
            recommendations.map(async (rec) => {
              try {
                const results = await alpasService.searchBooks(rec.title);
                const available = results.find(r => r.isAvailable);
                return available ? rec : null;
              } catch {
                return rec; // 오류 시 포함 (보수적)
              }
            })
          );
          filteredRecs = checks.filter((r): r is typeof recommendations[0] => r !== null);
          console.log(`[DID librarian] 대출가능 필터: ${filteredRecs.length}/${recommendations.length}권`);
        }

        const didBooks = await enrichBookCovers(filteredRecs.map((rec) => ({
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

        return reply.send({ success: true, data: didBooks });
      }

      // 유아/초등/청소년: 정보나루 인기대출도서
      const ageGroup = group.toLowerCase() as 'preschool' | 'elementary' | 'teen';
      const DESIRED_COUNT = 10;

      // 캐시 확인 (ALPAS 필터 결과 포함, 1시간)
      const ageCacheKey = `did_age_${ageGroup}`;
      const cached = ageFilterCache.get(ageCacheKey);
      if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) {
        return reply.send({ success: true, data: cached.data });
      }

      // 정보나루에서 200권 가져옴 (소장 10권을 채우기 위해 넉넉히)
      const popular = await data4libraryService.getPopularByAgeGroup(ageGroup, 200);

      const alpasConnected = isAlpasConnected();
      let filtered: typeof popular;

      if (alpasConnected) {
        // 10권 모일 때까지 배치 병렬 소장 확인
        filtered = [];
        const BATCH_SIZE = 20;
        for (let i = 0; i < popular.length && filtered.length < DESIRED_COUNT; i += BATCH_SIZE) {
          const batch = popular.slice(i, i + BATCH_SIZE);
          const checks = await Promise.all(
            batch.map(async (book) => {
              try {
                const results = await alpasService.searchBooks(book.bookname);
                // 소장 확인 + 대출가능(loan_able=Y) 필터
                const available = results.find(r => r.isAvailable);
                if (!available) return null; // 소장 없거나 대출 불가
                (book as any)._alpasId = available.id;
                (book as any)._alpasShelfCode = available.shelfCode || '';
                return book;
              } catch { /* skip */ }
              return null;
            })
          );
          for (const b of checks) {
            if (b && filtered.length < DESIRED_COUNT) filtered.push(b);
          }
        }
        console.log(`[DID age/${ageGroup}] ALPAS 소장 확인 완료: ${filtered.length}권`);
      } else {
        filtered = popular.slice(0, DESIRED_COUNT);
      }

      const didBooks = filtered.map((book) => ({
        // ISBN13을 우선 사용 — 상세 조회 시 data4library로 안정적으로 조회 가능
        id: book.isbn13 || (book as any)._alpasId || `d4l_${book.ranking}`,
        title: book.bookname,
        author: book.authors,
        coverImageUrl: book.bookImageURL || undefined,
        shelfCode: (book as any)._alpasShelfCode || '',
        category: book.class_nm || '',
        hasVideo: false,
        publisher: book.publisher,
        summary: '',
      }));

      // 결과 캐시 저장
      ageFilterCache.set(ageCacheKey, { data: didBooks, timestamp: Date.now() });

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
      let book = await alpasService.getBookDetail(bookId);

      // 항상 제목으로 재검색하여 가장 완전한 데이터로 보강
      if (book) {
        try {
          console.log(`[DID getBookDetail] Re-searching title: "${book.title}"`);
          const searchResults = await alpasService.searchBooks(book.title);
          console.log(`[DID getBookDetail] Search returned ${searchResults.length} results`);
          const better = searchResults.find(b => b.shelfCode || b.callNumber) || searchResults[0];
          if (better) {
            console.log(`[DID getBookDetail] Better match: shelfCode="${better.shelfCode}" isbn="${better.isbn}"`);
            book = {
              ...book,
              shelfCode: book.shelfCode || better.shelfCode,
              callNumber: book.callNumber || better.callNumber,
              publisher: book.publisher || better.publisher,
              isbn: book.isbn || better.isbn,
              summary: (book.summary && !book.summary.includes('출판한 도서입니다')) ? book.summary : better.summary,
              publishedYear: book.publishedYear || better.publishedYear,
              isAvailable: better.isAvailable,
            };
          }
        } catch (err: any) {
          console.error(`[DID getBookDetail] Re-search failed: ${err.message}`);
        }
      }

      if (book) {
        // 알라딘에서 풍부한 줄거리 가져오기 → Gemini 리라이트
        let enrichedSummary = book.summary;
        try {
          const aladinDesc = await fetchAladinDescription(book.title, book.author);
          if (aladinDesc && aladinDesc.length > 30) {
            if (!enrichedSummary || enrichedSummary.length < aladinDesc.length || enrichedSummary.includes('출판한 도서입니다')) {
              enrichedSummary = await rewriteDescription(aladinDesc, book.title);
              console.log(`[DID getBookDetail] Rewritten summary (${enrichedSummary.length}자): ${enrichedSummary.substring(0, 60)}...`);
            }
          }
        } catch { /* ignore */ }

        return reply.send({
          success: true,
          data: {
            id: book.id,
            title: book.title,
            author: book.author,
            publisher: book.publisher,
            publishedYear: book.publishedYear,
            isbn: book.isbn,
            summary: enrichedSummary,
            shelfCode: book.shelfCode,
            callNumber: book.callNumber,
            category: book.category,
            coverImageUrl: await enrichCoverUrl(book.title, book.author, book.coverImageUrl, book.isbn),
            isAvailable: book.isAvailable,
          },
        });
      }

      // 2. ISBN13이면 data4library에서 책 정보 조회 후 ALPAS 제목 검색으로 보강
      if (/^\d{13}$/.test(bookId)) {
        try {
          const d4lBook = await data4libraryService.getBookDetail(bookId);
          if (d4lBook && d4lBook.bookname) {
            console.log(`[DID getBookDetail] data4library hit for ISBN ${bookId}: ${d4lBook.bookname}`);

            // ALPAS에서 제목으로 검색하여 소장/대출가능 정보 보강
            let shelfCode = '';
            let callNumber = '';
            let isAvailable = true;
            try {
              const alpasResults = await alpasService.searchBooks(d4lBook.bookname);
              const best = alpasResults.find(b => b.shelfCode || b.callNumber) || alpasResults[0];
              if (best) {
                shelfCode = best.shelfCode || '';
                callNumber = best.callNumber || '';
                isAvailable = best.isAvailable;
              }
            } catch { /* ALPAS 없어도 data4library 정보로 표시 */ }

            const summary = d4lBook.description
              ? await rewriteDescription(d4lBook.description, d4lBook.bookname).catch(() => d4lBook.description)
              : '';

            return reply.send({
              success: true,
              data: {
                id: bookId,
                title: d4lBook.bookname,
                author: d4lBook.authors,
                publisher: d4lBook.publisher,
                publishedYear: parseInt(d4lBook.publication_year, 10) || undefined,
                isbn: bookId,
                summary,
                shelfCode: shelfCode || undefined,
                callNumber: callNumber || undefined,
                category: d4lBook.class_nm || '',
                coverImageUrl: await enrichCoverUrl(d4lBook.bookname, d4lBook.authors, d4lBook.bookImageURL, bookId),
                isAvailable,
              },
            });
          }
        } catch (err: any) {
          console.error(`[DID getBookDetail] data4library lookup failed: ${err.message}`);
        }
      }

      // 3. VideoRecord에서 책 정보 조회 (위 경로 모두 실패한 경우)
      const videoRecord = await videoRepository.findByBookId(bookId);
      if (videoRecord && videoRecord.title) {
        console.log(`[DID getBookDetail] Using book info from VideoRecord: ${videoRecord.title}`);

        // VideoRecord도 불완전할 수 있으므로 ALPAS 제목 검색으로 보강
        let shelfCode = '';
        let callNumber = '';
        let publisher = videoRecord.publisher || '';
        let isbn = '';
        let summary = videoRecord.summary || '';
        let publishedYear = 0;
        let isAvailable = true;

        try {
          console.log(`[DID getBookDetail] Re-searching VideoRecord title: "${videoRecord.title}"`);
          const searchResults = await alpasService.searchBooks(videoRecord.title);
          const better = searchResults.find(b => b.shelfCode || b.callNumber) || searchResults[0];
          if (better) {
            console.log(`[DID getBookDetail] VideoRecord re-match: shelfCode="${better.shelfCode}"`);
            shelfCode = better.shelfCode || '';
            callNumber = better.callNumber || '';
            publisher = publisher || better.publisher || '';
            isbn = better.isbn || '';
            summary = summary || better.summary || '';
            publishedYear = better.publishedYear || 0;
            isAvailable = better.isAvailable;
          }
        } catch (err: any) {
          console.error(`[DID getBookDetail] VideoRecord re-search failed: ${err.message}`);
        }

        return reply.send({
          success: true,
          data: {
            id: bookId,
            title: videoRecord.title,
            author: videoRecord.author || '저자 미상',
            publisher,
            publishedYear: publishedYear || undefined,
            isbn: isbn || undefined,
            summary,
            shelfCode: shelfCode || undefined,
            callNumber: callNumber || undefined,
            category: videoRecord.category || '',
            coverImageUrl: await enrichCoverUrl(videoRecord.title, videoRecord.author || '', videoRecord.coverImageUrl || undefined, isbn || undefined),
            isAvailable,
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
            coverImageUrl: await enrichCoverUrl(book.title, book.author, book.coverImageUrl, book.isbn),
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
