import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { Book } from '../types';

/**
 * Real ALPAS API Service
 *
 * AD201.do: 검색/목록 (GET keyword, POST libNo+searchWord)
 * AE117.do: 신착자료 (GET shelf_date)
 * AD206.do: 도서 상세정보 (GET book_key) — 책키 1건 상세
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

/** AD206.do 응답: 도서 상세정보 (book_key 1건) */
interface AlpasAD206Response {
  status?: string;
  statusDescription?: string;
  statusCode?: string;
  bookinfo?: AlpasAD206BookInfo;
}

/** AD206 bookinfo 컨테이너 */
interface AlpasAD206BookInfo {
  BOOK_KEY?: string;
  REG_NO?: string;
  TITLE?: string;
  AUTHOR?: string;
  PUBLISHER?: string;
  PUB_YEAR_INFO?: string | number;
  ISBN?: string;
  CALL_NO?: string;
  SHELF_LOC_CODE_DESC?: string;
  USE_LIMIT_CODE_DESC?: string;
  LOAN_ABLE?: string;
  [key: string]: unknown;
}

export class AlpasRealService {
  private readonly client = createAlpasClient();

  /**
   * AD201 result.list 항목 → 내부 Book 모델
   */
  private mapToBook(item: AlpasBook201, index: string): Book {
    const id = item.bookId || item.orgNo || `ALPAS_${Date.now()}_${index}`;
    const title = item.bookTitle || '제목 없음';
    const author = item.author || '저자 미상';
    const publisher = item.publisher || '출판사 미상';
    const publishYear = item.publishYear != null ? String(item.publishYear) : '';
    const isbn = item.isbn || '';
    const callNumber = item.callNo || '';
    const shelfCode = item.subject || item.kdc || '';
    const regNo = item.orgNo || '';
    const loanPossible = item.loanPossible || 'N';
    const category = item.kdc || '일반';

    return {
      id,
      title: this.cleanTitle(title),
      author: this.cleanAuthor(author),
      publisher: this.cleanText(publisher),
      publishedYear: this.parseYear(String(publishYear)),
      isbn: isbn.replace(/[^0-9]/g, ''),
      summary: `${title} - ${author} 저. ${publisher}에서 출판한 도서입니다.`,
      callNumber,
      registrationNumber: regNo,
      shelfCode: this.cleanShelfCode(shelfCode),
      isAvailable: loanPossible === 'Y',
      coverImageUrl: item.bookImage || `https://picsum.photos/seed/${id}/300/400`,
      category,
    };
  }

  /**
   * AE117 searchList 항목 → 내부 Book 모델
   */
  private mapToBookFromAE117(item: AlpasBookAE117, index: string): Book {
    const id = item.BOOK_KEY || item.REG_NO || `ALPAS_${Date.now()}_${index}`;
    const title = item.TITLE || '제목 없음';
    const author = item.AUTHOR || '저자 미상';
    const publisher = item.PUBLISHER || '출판사 미상';
    const publishYear = item.PUBLISH_YEAR != null ? String(item.PUBLISH_YEAR) : '';
    const isbn = item.EA_ISBN || '';
    const callNumber = item.CALL_NO || '';
    const shelfCode = item.SHELF_LOC_CODE_DESC || '';
    const regNo = item.REG_NO || '';
    const loanAble = item.loan_able || 'N';
    const category = item.USE_LIMIT_CODE_DESC || '일반';

    return {
      id,
      title: this.cleanTitle(title),
      author: this.cleanAuthor(author),
      publisher: this.cleanText(publisher),
      publishedYear: this.parseYear(String(publishYear)),
      isbn: isbn.replace(/[^0-9]/g, ''),
      summary: `${title} - ${author} 저. ${publisher}에서 출판한 도서입니다.`,
      callNumber,
      registrationNumber: regNo,
      shelfCode: this.cleanShelfCode(shelfCode),
      isAvailable: loanAble === 'Y',
      coverImageUrl: `https://picsum.photos/seed/${id}/300/400`,
      category,
    };
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
    const list = response.data?.searchList;
    return Array.isArray(list) ? list : [];
  }

  /**
   * AD201.do GET 호출 (keyword 검색)
   */
  private async callAD201Get(keyword: string): Promise<(AlpasBook201 | AlpasBookAE117)[]> {
    const response = await this.client.get<AlpasAD201Response & AlpasAE117Response>('/AD201.do', {
      params: {
        networkadapterid: config.alpas.networkAdapterId,
        manage_code: config.alpas.manageCode,
        keyword,
        api_key: config.alpas.apiKey || undefined,
      },
    });
    const data = response.data;
    const list = data?.searchList ?? data?.result?.list;
    return Array.isArray(list) ? list : [];
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
   * AD206.do 호출 — 책키(book_key) 1건 상세정보
   * 문서: book_key 필수, 응답 bookinfo 컨테이너. status WARNING / HOMEPAGE_SERVICE_0142 시 미존재
   */
  private async callAD206(bookKey: string): Promise<AlpasAD206BookInfo | null> {
    try {
      const response = await this.client.get<AlpasAD206Response>('/AD206.do', {
        params: {
          book_key: bookKey.trim(),
          networkadapterid: config.alpas.networkAdapterId,
          manage_code: config.alpas.manageCode,
          api_key: config.alpas.apiKey || undefined,
        },
      });
      const data = response.data;
      if (data?.status === 'WARNING' || data?.statusCode === 'HOMEPAGE_SERVICE_0142') {
        return null;
      }
      const info = data?.bookinfo;
      return info && typeof info === 'object' ? info : null;
    } catch (error: any) {
      console.error('AD206 호출 에러:', error.message);
      return null;
    }
  }

  /**
   * AD206 bookinfo → 내부 Book 모델
   */
  private mapAD206ToBook(info: AlpasAD206BookInfo): Book {
    const id = info.BOOK_KEY || info.REG_NO || `ALPAS_${Date.now()}_0`;
    const title = info.TITLE || '제목 없음';
    const author = info.AUTHOR || '저자 미상';
    const publisher = info.PUBLISHER || '출판사 미상';
    const publishYear = info.PUB_YEAR_INFO != null ? String(info.PUB_YEAR_INFO) : '';
    const isbn = (info.ISBN || '').replace(/[^0-9]/g, '');
    const callNumber = info.CALL_NO || '';
    const shelfCode = info.SHELF_LOC_CODE_DESC || '';
    const regNo = info.REG_NO || '';
    const loanAble = (info.LOAN_ABLE || 'N').toUpperCase();
    const category = info.USE_LIMIT_CODE_DESC || '일반';

    return {
      id,
      title: this.cleanTitle(title),
      author: this.cleanAuthor(author),
      publisher: this.cleanText(publisher),
      publishedYear: this.parseYear(publishYear),
      isbn,
      summary: `${title} - ${author} 저. ${publisher}에서 출판한 도서입니다.`,
      callNumber,
      registrationNumber: regNo,
      shelfCode: this.cleanShelfCode(shelfCode),
      isAvailable: loanAble === 'Y',
      coverImageUrl: `https://picsum.photos/seed/${id}/300/400`,
      category,
    };
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
   * API 응답 항목에서 문자열 추출 (다양한 키 이름 대응)
   */
  private getString(item: Record<string, unknown>, ...keys: string[]): string {
    for (const k of keys) {
      const v = item[k];
      if (v != null && typeof v === 'string' && v.trim() !== '') return v.trim();
      if (v != null && typeof v === 'number') return String(v);
    }
    return '';
  }

  /**
   * 검색 결과 1건을 공통 필드로 매핑 (AD201/AE117 혼합 응답 대응)
   */
  private mapSearchItemToBook(item: Record<string, unknown>, index: string): Book {
    const id =
      this.getString(item, 'bookId', 'orgNo', 'BOOK_KEY', 'REG_NO', 'book_key', 'reg_no') ||
      `ALPAS_${Date.now()}_${index}`;
    const title =
      this.getString(item, 'bookTitle', 'title', 'TITLE', 'VOL_TITLE', 'volTitle', 'book_title') || '제목 없음';
    const author =
      this.getString(item, 'author', 'AUTHOR') || '저자 미상';
    const publisher =
      this.getString(item, 'publisher', 'PUBLISHER') || '출판사 미상';
    const publishYear = this.getString(
      item,
      'publishYear',
      'PUBLISH_YEAR',
      'publish_year'
    );
    const isbn = this.getString(item, 'isbn', 'EA_ISBN', 'ea_isbn').replace(/[^0-9]/g, '');
    const callNumber = this.getString(item, 'callNo', 'CALL_NO', 'call_no');
    const shelfCode =
      this.getString(item, 'subject', 'kdc', 'SHELF_LOC_CODE_DESC', 'shelfCode', 'kdc') || '';
    const regNo = this.getString(item, 'orgNo', 'REG_NO', 'reg_no');
    const loanPossible =
      String((item.loanPossible ?? item.loan_able ?? item['loan_able'] ?? 'N')).toUpperCase() === 'Y' ? 'Y' : 'N';
    const category = this.getString(item, 'kdc', 'USE_LIMIT_CODE_DESC', 'category') || '일반';
    const bookImage = item.bookImage ?? item.book_image ?? item['bookImage'];
    const coverImageUrl =
      typeof bookImage === 'string' && bookImage
        ? bookImage
        : `https://picsum.photos/seed/${id}/300/400`;

    return {
      id,
      title: this.cleanTitle(title),
      author: this.cleanAuthor(author),
      publisher: this.cleanText(publisher),
      publishedYear: this.parseYear(publishYear),
      isbn,
      summary: `${title} - ${author} 저. ${publisher}에서 출판한 도서입니다.`,
      callNumber,
      registrationNumber: regNo,
      shelfCode: this.cleanShelfCode(shelfCode),
      isAvailable: loanPossible === 'Y',
      coverImageUrl,
      category,
    };
  }

  /**
   * Search books by keyword (AD201 GET, keyword 파라미터)
   * 응답이 searchList/result.list 중 어떤 형태든, 다양한 키 이름(bookTitle/title/TITLE 등) 지원
   */
  async searchBooks(keyword: string): Promise<Book[]> {
    try {
      if (!keyword || keyword.trim() === '') {
        return await this.getNewArrivals();
      }
      const list = await this.callAD201Get(keyword.trim());
      if (list.length === 0) return [];
      return list.map((book, index) =>
        this.mapSearchItemToBook(book as Record<string, unknown>, String(index))
      );
    } catch (error: any) {
      console.error('AD201 검색 에러:', error.message);
      throw error;
    }
  }

  /** ID 비교용 정규화: trim, 공백 제거 (API별 bookId/orgNo/BOOK_KEY/REG_NO 형식 차이 흡수) */
  private normalizeId(id: string | undefined): string {
    if (id == null || typeof id !== 'string') return '';
    return id.trim().replace(/\s+/g, '');
  }

  private idMatches(a: string, b: string): boolean {
    const na = this.normalizeId(a);
    const nb = this.normalizeId(b);
    if (!na || !nb) return false;
    return na === nb;
  }

  /**
   * Get book details by ID.
   * 0) AD206 도서 상세 (book_key) — 1회 호출로 정확한 상세 조회
   * 1) AD201 GET 검색 후 bookId 일치
   * 2) AD201 POST 목록에서 매칭 (1~2페이지, 최대 100건)
   * 3) AD201 POST searchWord=bookId (목록 크기 확대)
   * 4) 신착(AE117) 목록에서 ID 매칭
   * 5) 연령별(AD201 GET) 목록에서 ID 매칭
   */
  async getBookDetail(bookId: string): Promise<Book | null> {
    const id = bookId?.trim();
    if (!id) return null;
    try {
      // 0) AD206 도서 상세 (책키 1건 상세 — 우선 사용)
      const ad206Info = await this.callAD206(id);
      if (ad206Info) return this.mapAD206ToBook(ad206Info);

      // 1) bookId로 키워드 검색 (동일 ID 단건 조회에 유리)
      const byKeyword = await this.callAD201Get(id);
      if (byKeyword.length > 0) {
        const first = byKeyword[0] as Record<string, unknown>;
        const isAE117 = first && (first['TITLE'] !== undefined || first['BOOK_KEY'] !== undefined);
        for (let i = 0; i < byKeyword.length; i++) {
          const item = byKeyword[i];
          const itemId = isAE117
            ? (item as AlpasBookAE117).BOOK_KEY || (item as AlpasBookAE117).REG_NO
            : (item as AlpasBook201).bookId || (item as AlpasBook201).orgNo;
          if (this.idMatches(String(itemId), id)) {
            return isAE117
              ? this.mapToBookFromAE117(item as AlpasBookAE117, '0')
              : this.mapToBook(item as AlpasBook201, '0');
          }
        }
        // 정확히 일치하지 않으면 첫 항목이라도 반환 (검색 결과 1건일 때)
        return isAE117
          ? this.mapToBookFromAE117(byKeyword[0] as AlpasBookAE117, '0')
          : this.mapToBook(byKeyword[0] as AlpasBook201, '0');
      }
      // 2) 목록에서 찾기 — 1·2페이지(최대 100건)까지 검사
      for (const page of [1, 2]) {
        const list = await this.callAD201(page, 50);
        const found = list.find(
          (b) => this.idMatches(b.bookId || '', id) || this.idMatches(b.orgNo || '', id)
        );
        if (found) return this.mapToBook(found, '0');
        if (list.length < 50) break;
      }
      // 3) searchWord=bookId로 POST 검색 (결과 30건까지)
      const bySearch = await this.callAD201(1, 30, id, '1');
      if (bySearch.length > 0) {
        const found = bySearch.find(
          (b) => this.idMatches(b.bookId || '', id) || this.idMatches(b.orgNo || '', id)
        );
        if (found) return this.mapToBook(found, '0');
        return this.mapToBook(bySearch[0], '0');
      }
      // 4) 신착(AE117) 목록에서 ID로 찾기 (DID 신착에서 클릭한 책 상세 조회)
      const arrivals = await this.getNewArrivalsInternal();
      const fromArrivals = arrivals.find((b) => this.idMatches(b.id, id));
      if (fromArrivals) return fromArrivals;
      // 5) 연령별(AD201 GET) 목록에서 ID로 찾기 (DID 연령별에서 클릭한 책 상세 조회)
      for (const group of ['elementary', 'preschool', 'teen'] as const) {
        const ageBooks = await this.getBooksByAgeGroup(group);
        const found = ageBooks.find((b) => this.idMatches(b.id, id));
        if (found) return found;
      }
      return null;
    } catch (error: any) {
      console.error('ALPAS API book detail error:', error.message);
      return null;
    }
  }

  /**
   * Get new arrival books (AE117) - 내부 재사용용 (getBookDetail fallback에서 호출)
   */
  private async getNewArrivalsInternal(): Promise<Book[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}/${m}/${d}`;
    };
    const list = await this.callAE117(formatDate(startDate), formatDate(endDate), 1, 30);
    return list.map((book, index) => this.mapToBookFromAE117(book, String(index)));
  }

  /**
   * Get new arrival books (AE117 특정 기간 신착자료)
   * 기간: 최근 1개월, 최대 30건 (DID 표시 + 상세 fallback용)
   */
  async getNewArrivals(): Promise<Book[]> {
    try {
      return await this.getNewArrivalsInternal();
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
   * Get books by age group (AD201 GET 키워드 검색 사용 — POST 미지원 서버에서도 동작)
   */
  async getBooksByAgeGroup(ageGroup: string): Promise<Book[]> {
    try {
      let keywords: string[] = [];
      switch (ageGroup.toLowerCase()) {
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
      const seenIds = new Set<string>();
      const seenTitles = new Set<string>(); // 제목 기준 중복 제거 (같은 책 다른 ID 대응)
      const normalizeTitle = (t: string) => t.trim().replace(/\s+/g, ' ').slice(0, 50);
      const allBooks: Book[] = [];
      for (const keyword of keywords) {
        const list = await this.callAD201Get(keyword);
        for (let i = 0; i < list.length; i++) {
          const book = this.mapSearchItemToBook(list[i] as Record<string, unknown>, `${keyword}-${i}`);
          const keyId = book.id;
          const keyTitle = normalizeTitle(book.title);
          if (!seenIds.has(keyId) && !seenTitles.has(keyTitle)) {
            seenIds.add(keyId);
            seenTitles.add(keyTitle);
            allBooks.push(book);
          }
          if (allBooks.length >= 9) break;
        }
        if (allBooks.length >= 9) break;
      }
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
