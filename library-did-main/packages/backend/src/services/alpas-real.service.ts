import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { Book } from '../types';

/**
 * Real ALPAS API Service
 *
 * AD201.do: POST, _apikey, libNo, startPage, pageSize, searchWord?, searchType? → result.list[]
 * AE117.do: 특정 기간 신착자료 검색. manage_code, shelf_date_from, shelf_date_to → searchList[]
 */

const DEFAULT_BASE_URL = 'http://www.alpas.kr/BTLMS/HOMEPAGE/API';

function createAlpasClient(): AxiosInstance {
  const baseURL = (config.alpas.apiUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  return axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

/** AD201 응답: result.list, result.totalCount */
interface AlpasAD201Response {
  result?: {
    totalCount?: string;
    list?: AlpasBook201[];
  };
}

/** AD201.do result.list 항목 (문서 기준, JSON 응답이라 숫자 올 수 있음) */
interface AlpasBook201 {
  bookId?: string;
  bookTitle?: string;
  author?: string;
  publisher?: string;
  publishYear?: string | number;
  callNo?: string;
  subject?: string;
  kdc?: string;
  regDate?: string;
  bookImage?: string;
  isbn?: string;
  orgNo?: string;
  bookType?: string;
  loanCnt?: string | number;
  loanPossible?: string;
}

/** AE117.do 응답: searchList, totalCount, totalPage */
interface AlpasAE117Response {
  status?: string;
  statusDescription?: string;
  statusCode?: string;
  totalCount?: number | string;
  totalPage?: number | string;
  searchList?: AlpasBookAE117[];
}

/** AE117.do searchList 항목 (문서 기준) */
interface AlpasBookAE117 {
  RNUM?: string | number;
  BOOK_KEY?: string;
  SPECIES_KEY?: string;
  REG_NO?: string;
  loan_able?: string;
  AUTHOR?: string;
  EA_ISBN?: string;
  PUBLISHER?: string;
  CALL_NO?: string;
  TITLE?: string;
  VOL_TITLE?: string;
  SHELF_LOC_CODE_DESC?: string;
  USE_LIMIT_CODE_DESC?: string;
  PUBLISH_YEAR?: string | number;
}

export class AlpasRealService {
  private readonly client = createAlpasClient();
  
  // 검색/목록 결과 캐시 (bookId -> Book)
  // 검색 결과나 목록에서 가져온 책 정보를 캐시하여 상세 조회 시 재사용
  private bookCache = new Map<string, { book: Book; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10분
  
  // 연령별 도서 캐시 (ageGroup -> Book[])
  private ageGroupCache = new Map<string, { books: Book[]; timestamp: number }>();
  private readonly AGE_GROUP_CACHE_TTL = 5 * 60 * 1000; // 5분
  
  private cacheBook(book: Book): void {
    this.bookCache.set(book.id, { book, timestamp: Date.now() });
  }
  
  private getCachedBook(bookId: string): Book | null {
    const cached = this.bookCache.get(bookId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[ALPAS Cache] Found cached book:', cached.book.title);
      return cached.book;
    }
    if (cached) {
      this.bookCache.delete(bookId); // 만료된 캐시 삭제
    }
    return null;
  }

  /**
   * 다양한 ALPAS API 응답 형식을 통합 처리하는 매핑 함수
   * - AD201 POST: camelCase (bookTitle, bookId, etc.)
   * - AE117/AD201 GET: 대문자 (TITLE, BOOK_KEY, etc.)
   * - AD201 GET searchList: snake_case (book_key, publish_year, etc.)
   * - 혼합 형식도 처리
   */
  private mapAnyToBook(item: Record<string, unknown>, index: string): Book {
    // ID: 다양한 필드명 시도 (snake_case 추가)
    const id = String(
      item.bookId || item.book_key || item.BOOK_KEY || item.orgNo || item.REG_NO ||
      item.reg_no || item.book_id || item.bookKey || `ALPAS_${Date.now()}_${index}`
    );

    // 제목: 다양한 필드명 시도 (snake_case 추가)
    const title = String(
      item.bookTitle || item.title || item.TITLE ||
      item.book_title || item.BOOK_TITLE || '제목 없음'
    );

    // 저자 (snake_case 추가)
    const author = String(
      item.author || item.AUTHOR || item.writer || item.WRITER || '저자 미상'
    );

    // 출판사 (snake_case 추가)
    const publisher = String(
      item.publisher || item.PUBLISHER || item.pub || '출판사 미상'
    );

    // 출판년도 (snake_case 추가)
    const publishYear = item.publishYear || item.publish_year || item.PUBLISH_YEAR || 
                        item.pubYear || item.PUB_YEAR || '';

    // ISBN (snake_case 추가)
    const isbn = String(item.isbn || item.ea_isbn || item.EA_ISBN || item.ISBN || '');

    // 청구기호 (snake_case 추가)
    const callNumber = String(item.callNo || item.call_no || item.CALL_NO || '');

    // 서가 위치 (snake_case 추가)
    const shelfCode = String(
      item.shelf_loc_code_desc || item.SHELF_LOC_CODE_DESC || 
      item.subject || item.kdc || item.shelfCode || ''
    );

    // 등록번호 (snake_case 추가)
    const regNo = String(item.orgNo || item.reg_no || item.REG_NO || item.regNo || '');

    // 대출 가능 여부 (snake_case 추가)
    const loanPossible = String(item.loanPossible || item.loan_able || item.LOAN_ABLE || 'N');

    // 카테고리 (snake_case 추가)
    const category = String(
      item.use_limit_code_desc || item.USE_LIMIT_CODE_DESC ||
      item.kdc || item.class_no || item.category || item.CATEGORY || '일반'
    );

    // 표지 이미지 (snake_case 추가)
    const coverImage = item.bookImage || item.book_image || item.BOOK_IMAGE || 
                       item.coverImageUrl || item.image;

    const cleanedTitle = this.cleanTitle(title);
    const cleanedAuthor = this.cleanAuthor(author);
    const cleanedPublisher = this.cleanText(publisher);

    return {
      id,
      title: cleanedTitle,
      author: cleanedAuthor,
      publisher: cleanedPublisher,
      publishedYear: this.parseYear(String(publishYear)),
      isbn: isbn.replace(/[^0-9]/g, ''),
      summary: `${cleanedTitle} - ${cleanedAuthor} 저. ${cleanedPublisher}에서 출판한 도서입니다.`,
      callNumber,
      registrationNumber: regNo,
      shelfCode: this.cleanShelfCode(shelfCode),
      isAvailable: loanPossible === 'Y' || loanPossible === 'y',
      coverImageUrl: coverImage ? String(coverImage) : `https://picsum.photos/seed/${id}/300/400`,
      category,
    };
  }

  /**
   * AD201 result.list 항목 → 내부 Book 모델 (하위 호환성 유지)
   */
  private mapToBook(item: AlpasBook201, index: string): Book {
    return this.mapAnyToBook(item as unknown as Record<string, unknown>, index);
  }

  /**
   * AE117 searchList 항목 → 내부 Book 모델 (하위 호환성 유지)
   */
  private mapToBookFromAE117(item: AlpasBookAE117, index: string): Book {
    return this.mapAnyToBook(item as unknown as Record<string, unknown>, index);
  }

  /**
   * AE117.do 호출 (특정 기간 신착자료)
   * @param shelfDateFrom 배가일자 시작 YYYY/MM/DD
   * @param shelfDateTo 배가일자 끝 YYYY/MM/DD
   */
  private async callAE117(
    shelfDateFrom: string,
    shelfDateTo: string,
    currentPage: number = 1,
    countPerPage: number = 10
  ): Promise<AlpasBookAE117[]> {
    try {
      console.log('[ALPAS AE117] Calling with dates:', shelfDateFrom, 'to', shelfDateTo);
      const response = await this.client.get<AlpasAE117Response>('/AE117.do', {
        params: {
          networkadapterid: config.alpas.networkAdapterId,
          manage_code: config.alpas.manageCode,
          shelf_date_from: shelfDateFrom,
          shelf_date_to: shelfDateTo,
          current_page: String(currentPage),
          count_per_page: String(countPerPage),
          api_key: config.alpas.apiKey || undefined,
        },
      });
      const data = response.data as Record<string, unknown>;
      console.log('[ALPAS AE117] Response status:', (data as any)?.status, (data as any)?.statusDescription);
      // searchList, searchlist (소문자) 모두 확인
      const list = (data?.searchList ?? data?.searchlist) as AlpasBookAE117[];
      if (Array.isArray(list) && list.length > 0) {
        console.log('[ALPAS AE117] Got', list.length, 'items');
        console.log('[ALPAS AE117] First item keys:', Object.keys(list[0]));
        console.log('[ALPAS AE117] First item TITLE:', list[0].TITLE);
      } else {
        console.log('[ALPAS AE117] No items found');
      }
      return Array.isArray(list) ? list : [];
    } catch (error: any) {
      console.error('[ALPAS AE117] Error:', error.message);
      if (error.response) {
        console.error('[ALPAS AE117] Response status:', error.response.status);
      }
      throw error;
    }
  }

  /**
   * AD201.do GET 호출 (keyword 검색)
   * search_type: 1=제목, 2=저자, 3=출판사, 4=ISBN, 5=전체
   */
  private async callAD201Get(keyword: string): Promise<(AlpasBook201 | AlpasBookAE117)[]> {
    try {
      console.log('[ALPAS AD201 GET] Calling with keyword:', keyword);
      const response = await this.client.get<AlpasAD201Response & AlpasAE117Response>('/AD201.do', {
        params: {
          networkadapterid: config.alpas.networkAdapterId,
          manage_code: config.alpas.manageCode,
          keyword,
          search_type: '1', // 제목 검색
          api_key: config.alpas.apiKey || undefined,
        },
      });
      const data = response.data as Record<string, unknown>;
      console.log('[ALPAS AD201 GET] Response status:', response.status);
      console.log('[ALPAS AD201 GET] Response keys:', Object.keys(data || {}));
      // searchList, searchlist (소문자), result.list 모두 확인
      const list = (data?.searchList ?? data?.searchlist ?? (data?.result as Record<string, unknown>)?.list) as (AlpasBook201 | AlpasBookAE117)[];
      if (Array.isArray(list) && list.length > 0) {
        console.log('[ALPAS AD201 GET] Got', list.length, 'items');
        console.log('[ALPAS AD201 GET] First item keys:', Object.keys(list[0]));
        console.log('[ALPAS AD201 GET] First 3 items:', list.slice(0, 3).map((item: any) => ({
          title: item.title || item.TITLE || item.bookTitle,
          author: item.author || item.AUTHOR,
          book_key: item.book_key || item.BOOK_KEY || item.bookId,
        })));
      } else {
        console.log('[ALPAS AD201 GET] No items found');
      }
      return Array.isArray(list) ? list : [];
    } catch (error: any) {
      console.error('[ALPAS AD201 GET] Error:', error.message);
      if (error.response) {
        console.error('[ALPAS AD201 GET] Response status:', error.response.status);
        console.error('[ALPAS AD201 GET] Response data:', JSON.stringify(error.response.data).slice(0, 500));
      }
      throw error;
    }
  }

  /**
   * AD201.do POST 공통 호출 (libNo 기반, _apikey)
   */
  private async callAD201(
    startPage: number,
    pageSize: number,
    searchWord?: string,
    searchType?: string
  ): Promise<AlpasBook201[]> {
    const body = new URLSearchParams();
    body.set('_apikey', config.alpas.apiKey || '');
    body.set('libNo', config.alpas.libNo);
    body.set('startPage', String(startPage));
    body.set('pageSize', String(pageSize));
    if (searchWord != null && searchWord.trim() !== '') {
      body.set('searchWord', searchWord.trim());
      if (searchType != null) body.set('searchType', String(searchType));
    }

    const response = await this.client.post<AlpasAD201Response>('/AD201.do', body);
    const list = response.data?.result?.list;
    return Array.isArray(list) ? list : [];
  }

  /**
   * Clean and format title
   */
  private cleanTitle(title: string): string {
    return title.trim().replace(/\s+/g, ' ');
  }

  /**
   * Clean and format author
   */
  private cleanAuthor(author: string): string {
    // Remove extra formatting like "[공]지음", "글:", "그림:" etc.
    return author
      .replace(/\[공\]지음/g, '')
      .replace(/지음/g, '')
      .replace(/글:/g, '')
      .replace(/그림:/g, '')
      .replace(/;/g, ',')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Clean general text
   */
  private cleanText(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Clean shelf code (remove library prefix)
   */
  private cleanShelfCode(shelfCode: string): string {
    return shelfCode
      .replace(/\[행복\]/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();
  }

  /**
   * Parse year from string
   */
  private parseYear(yearStr: string): number {
    const cleaned = yearStr.replace(/[^\d]/g, '');
    const year = parseInt(cleaned, 10);
    return isNaN(year) ? new Date().getFullYear() : year;
  }

  /**
   * Search books by keyword (AD201 GET, keyword 파라미터)
   */
  async searchBooks(keyword: string): Promise<Book[]> {
    try {
      if (!keyword || keyword.trim() === '') {
        return await this.getNewArrivals();
      }
      const list = await this.callAD201Get(keyword.trim());
      if (list.length === 0) return [];
      // 통합 매핑 함수 사용 - 다양한 필드명 자동 처리
      const books = list.map((book, index) =>
        this.mapAnyToBook(book as Record<string, unknown>, String(index))
      );
      // 검색 결과를 캐시에 저장
      books.forEach((book) => this.cacheBook(book));
      return books;
    } catch (error: any) {
      console.error('AD201 검색 에러:', error.message);
      throw error;
    }
  }

  /**
   * Get book details by ID (여러 API 소스에서 bookId 매칭)
   * bookId는 ALPAS의 book_key, BOOK_KEY, bookId, orgNo 등 다양한 형태일 수 있음
   */
  async getBookDetail(bookId: string): Promise<Book | null> {
    try {
      console.log('[ALPAS getBookDetail] Looking for bookId:', bookId);
      
      // 0. 먼저 캐시에서 찾기 (검색 결과나 이전 조회에서 캐시됨)
      const cached = this.getCachedBook(bookId);
      if (cached) {
        return cached;
      }
      
      // 1. bookId로 직접 검색 (가장 확실한 방법)
      // ALPAS는 bookId/book_key로 직접 조회하는 API가 없으므로 검색으로 대체
      const searchResults = await this.callAD201Get(bookId);
      if (searchResults.length > 0) {
        // 검색 결과에서 정확히 일치하는 ID 찾기
        const exactMatch = searchResults.find((item) => {
          const itemId = String(
            (item as any).bookId || (item as any).book_key || (item as any).BOOK_KEY || 
            (item as any).orgNo || (item as any).REG_NO || ''
          );
          return itemId === bookId;
        });
        
        if (exactMatch) {
          console.log('[ALPAS getBookDetail] Found via direct search');
          const book = this.mapAnyToBook(exactMatch as Record<string, unknown>, '0');
          this.cacheBook(book);
          return book;
        }
        
        // 정확한 매칭이 없으면 첫 번째 결과 사용 (bookId가 제목일 수도 있음)
        console.log('[ALPAS getBookDetail] Using first search result');
        const book = this.mapAnyToBook(searchResults[0] as Record<string, unknown>, '0');
        // ID를 요청된 bookId로 덮어쓰기 (일관성 유지)
        const bookWithCorrectId = { ...book, id: bookId };
        this.cacheBook(bookWithCorrectId);
        return bookWithCorrectId;
      }
      
      // 2. AE117 (신작) 목록에서 찾기 - 신작 페이지에서 온 요청일 가능성 높음
      const newArrivals = await this.getNewArrivals();
      const foundInNewArrivals = newArrivals.find((b) => b.id === bookId);
      if (foundInNewArrivals) {
        console.log('[ALPAS getBookDetail] Found in new arrivals:', foundInNewArrivals.title);
        this.cacheBook(foundInNewArrivals);
        return foundInNewArrivals;
      }
      
      // 3. AD201 POST로 목록 조회 후 매칭
      const list = await this.callAD201(1, 50);
      const found = list.find((b) => {
        const bId = String(b.bookId || b.orgNo || '');
        return bId === bookId;
      });
      if (found) {
        console.log('[ALPAS getBookDetail] Found in AD201 POST list');
        const book = this.mapToBook(found, '0');
        this.cacheBook(book);
        return book;
      }
      
      console.log('[ALPAS getBookDetail] Book not found');
      return null;
    } catch (error: any) {
      console.error('[ALPAS getBookDetail] Error:', error.message);
      return null;
    }
  }

  /**
   * Get new arrival books (AE117 특정 기간 신착자료)
   * 기간: 최근 1개월, 날짜 형식: YYYY/MM/DD
   */
  async getNewArrivals(): Promise<Book[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // 최근 1개월

      const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}/${m}/${d}`;
      };

      const list = await this.callAE117(formatDate(startDate), formatDate(endDate), 1, 10);
      const books = list.map((book, index) => this.mapToBookFromAE117(book, String(index)));
      // 신작 목록도 캐시에 저장
      books.forEach((book) => this.cacheBook(book));
      return books;
    } catch (error: any) {
      console.error('AE117 호출 에러:', error.message);
      throw error;
    }
  }

  /**
   * Get librarian recommended books (AD201 검색 여러 키워드)
   */
  async getLibrarianPicks(): Promise<Book[]> {
    try {
      const keywords = ['어린왕자', '이상한나라', '해리포터'];
      const allBooks: Book[] = [];
      for (const keyword of keywords) {
        const list = await this.callAD201(1, 1, keyword, '1');
        if (list.length > 0) allBooks.push(this.mapToBook(list[0], String(allBooks.length)));
      }
      return allBooks;
    } catch (error: any) {
      console.error('ALPAS API librarian picks error:', error.message);
      return [];
    }
  }

  /**
   * Get books by age group (AD201 GET 검색 - 병렬 호출 + 캐시)
   */
  async getBooksByAgeGroup(ageGroup: string): Promise<Book[]> {
    try {
      const normalizedGroup = ageGroup.toLowerCase();
      
      // 캐시 확인
      const cached = this.ageGroupCache.get(normalizedGroup);
      if (cached && Date.now() - cached.timestamp < this.AGE_GROUP_CACHE_TTL) {
        console.log(`[ALPAS] Age group cache hit: ${normalizedGroup}`);
        return cached.books;
      }
      
      let keywords: string[] = [];
      switch (normalizedGroup) {
        case 'preschool':
        case '유아':
          keywords = ['그림책', '동화'];
          break;
        case 'elementary':
        case '초등':
          keywords = ['과학', '역사', '모험'];
          break;
        case 'teen':
        case '청소년':
          keywords = ['청소년', '소설'];
          break;
        default:
          return [];
      }
      
      // 병렬로 모든 키워드 검색 (속도 개선)
      const results = await Promise.all(
        keywords.map((keyword) => this.callAD201Get(keyword))
      );
      
      const allBooks: Book[] = [];
      results.forEach((list, keywordIndex) => {
        list.slice(0, 5).forEach((item, i) => 
          allBooks.push(this.mapAnyToBook(item as Record<string, unknown>, String(allBooks.length + i)))
        );
      });
      
      // 검색 결과 캐시에 저장
      allBooks.forEach((book) => this.cacheBook(book));
      
      // 연령별 캐시에 저장
      this.ageGroupCache.set(normalizedGroup, { books: allBooks, timestamp: Date.now() });
      
      return allBooks;
    } catch (error: any) {
      console.error('ALPAS API age group error:', error.message);
      return [];
    }
  }

  /**
   * Get all books (for admin)
   */
  async getAllBooks(): Promise<Book[]> {
    return await this.getNewArrivals();
  }
}

// Export singleton instance
export const alpasRealService = new AlpasRealService();
