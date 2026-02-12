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
      // searchList(대문자 TITLE 등) → mapToBookFromAE117, result.list(camelCase) → mapToBook
      const first = list[0] as Record<string, unknown>;
      const isAE117Style = first && (first['TITLE'] !== undefined || first['BOOK_KEY'] !== undefined);
      return list.map((book, index) =>
        isAE117Style
          ? this.mapToBookFromAE117(book as AlpasBookAE117, String(index))
          : this.mapToBook(book as AlpasBook201, String(index))
      );
    } catch (error: any) {
      console.error('AD201 검색 에러:', error.message);
      throw error;
    }
  }

  /**
   * Get book details by ID (AD201 1건 조회 후 bookId 매칭)
   */
  async getBookDetail(bookId: string): Promise<Book | null> {
    try {
      const list = await this.callAD201(1, 50);
      const found = list.find((b) => (b.bookId || b.orgNo) === bookId);
      if (found) return this.mapToBook(found, '0');
      // 검색으로 찾기 시도
      const bySearch = await this.callAD201(1, 10, bookId, '1');
      if (bySearch.length > 0) return this.mapToBook(bySearch[0], '0');
      return null;
    } catch (error: any) {
      console.error('ALPAS API book detail error:', error.message);
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
      return list.map((book, index) => this.mapToBookFromAE117(book, String(index)));
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
   * Get books by age group (AD201 검색)
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
      const allBooks: Book[] = [];
      for (const keyword of keywords) {
        const list = await this.callAD201(1, 5, keyword, '1');
        list.forEach((item, i) => allBooks.push(this.mapToBook(item, String(allBooks.length + i))));
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
