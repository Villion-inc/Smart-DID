import { config } from '../config';

/**
 * 정보나루(data4library.kr) Open API 클라이언트
 *
 * 사용 API:
 * - loanItemSrch  : 인기대출도서 조회 (연령별)
 * - srchDtlList   : 도서 상세 (표지 + 줄거리)
 * - srchBooks     : 도서 검색
 * - newArrivalBook: 신착도서 조회
 */

// ─── 타입 ───

export interface Data4LibBook {
  no: number;
  ranking: number;
  bookname: string;
  authors: string;
  publisher: string;
  publication_year: string;
  isbn13: string;
  addition_symbol: string;
  vol: string;
  class_no: string;
  class_nm: string;
  bookImageURL: string;
  bookDtlUrl?: string;
  loan_count: number;
}

export interface Data4LibBookDetail {
  bookname: string;
  authors: string;
  publisher: string;
  publication_year: string;
  isbn13: string;
  class_no: string;
  class_nm: string;
  bookImageURL: string;
  description: string;
}

// ─── 캐시 ───

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6시간
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── 서비스 ───

class Data4LibraryService {
  private authKey: string;
  private baseUrl: string;

  constructor() {
    this.authKey = config.data4library.authKey;
    this.baseUrl = config.data4library.baseUrl;
  }

  isConfigured(): boolean {
    return Boolean(this.authKey);
  }

  /**
   * 인기대출도서 조회 (연령별)
   * age codes: 0=영유아(0~5), 6=유아(6~7), 8=초등(8~13), 14=청소년(14~19)
   */
  async getPopularByAge(
    ageCodes: string,
    pageSize: number = 20,
  ): Promise<Data4LibBook[]> {
    if (!this.isConfigured()) return [];

    const cacheKey = `popular_age_${ageCodes}_${pageSize}`;
    const cached = getCached<Data4LibBook[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        authKey: this.authKey,
        age: ageCodes,
        pageSize: String(pageSize),
        format: 'json',
      });

      const url = `${this.baseUrl}/loanItemSrch?${params}`;
      console.log(`[Data4Library] getPopularByAge: age=${ageCodes}`);

      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[Data4Library] API error: ${res.status}`);
        return [];
      }

      const json = await res.json();
      const docs = json?.response?.docs || [];

      const books: Data4LibBook[] = docs.map((item: any) => {
        const doc = item.doc || item;
        return {
          no: Number(doc.no) || 0,
          ranking: Number(doc.ranking) || 0,
          bookname: this.cleanCDATA(doc.bookname || ''),
          authors: this.cleanCDATA(doc.authors || ''),
          publisher: this.cleanCDATA(doc.publisher || ''),
          publication_year: this.cleanCDATA(doc.publication_year || ''),
          isbn13: this.cleanCDATA(doc.isbn13 || ''),
          addition_symbol: this.cleanCDATA(doc.addition_symbol || ''),
          vol: doc.vol || '',
          class_no: this.cleanCDATA(doc.class_no || ''),
          class_nm: this.cleanCDATA(doc.class_nm || ''),
          bookImageURL: this.cleanCDATA(doc.bookImageURL || ''),
          bookDtlUrl: doc.bookDtlUrl || '',
          loan_count: Number(doc.loan_count) || 0,
        };
      });

      setCache(cacheKey, books);
      console.log(`[Data4Library] Got ${books.length} books for age=${ageCodes}`);
      return books;
    } catch (err: any) {
      console.error(`[Data4Library] getPopularByAge failed:`, err.message);
      return [];
    }
  }

  /**
   * 도서 상세 조회 (ISBN 기반 — 표지 + 줄거리)
   */
  async getBookDetail(isbn13: string): Promise<Data4LibBookDetail | null> {
    if (!this.isConfigured() || !isbn13) return null;

    const cacheKey = `detail_${isbn13}`;
    const cached = getCached<Data4LibBookDetail>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        authKey: this.authKey,
        isbn13,
        format: 'json',
      });

      const url = `${this.baseUrl}/srchDtlList?${params}`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const json = await res.json();
      const detail = json?.response?.detail?.[0]?.book;
      if (!detail) return null;

      const book: Data4LibBookDetail = {
        bookname: this.cleanCDATA(detail.bookname || ''),
        authors: this.cleanCDATA(detail.authors || ''),
        publisher: this.cleanCDATA(detail.publisher || ''),
        publication_year: this.cleanCDATA(detail.publication_year || ''),
        isbn13: this.cleanCDATA(detail.isbn13 || ''),
        class_no: this.cleanCDATA(detail.class_no || ''),
        class_nm: this.cleanCDATA(detail.class_nm || ''),
        bookImageURL: this.cleanCDATA(detail.bookImageURL || ''),
        description: this.cleanCDATA(detail.description || ''),
      };

      setCache(cacheKey, book);
      return book;
    } catch (err: any) {
      console.error(`[Data4Library] getBookDetail failed:`, err.message);
      return null;
    }
  }

  /**
   * 표지 URL 조회 (ISBN 기반)
   * 인기대출도서에서 이미 bookImageURL을 제공하므로 그걸 우선 사용하고,
   * 없을 때만 상세 조회로 fallback
   */
  async getCoverImage(isbn13: string): Promise<string | null> {
    if (!isbn13) return null;
    const detail = await this.getBookDetail(isbn13);
    return detail?.bookImageURL || null;
  }

  /**
   * 도서 검색
   */
  async searchBooks(keyword: string, pageSize: number = 20): Promise<Data4LibBook[]> {
    if (!this.isConfigured() || !keyword) return [];

    try {
      const params = new URLSearchParams({
        authKey: this.authKey,
        keyword,
        pageSize: String(pageSize),
        format: 'json',
      });

      const url = `${this.baseUrl}/srchBooks?${params}`;
      const res = await fetch(url);
      if (!res.ok) return [];

      const json = await res.json();
      const docs = json?.response?.docs || [];

      return docs.map((item: any) => {
        const doc = item.doc || item;
        return {
          no: 0,
          ranking: 0,
          bookname: this.cleanCDATA(doc.bookname || ''),
          authors: this.cleanCDATA(doc.authors || ''),
          publisher: this.cleanCDATA(doc.publisher || ''),
          publication_year: this.cleanCDATA(doc.publication_year || ''),
          isbn13: this.cleanCDATA(doc.isbn13 || ''),
          addition_symbol: this.cleanCDATA(doc.addition_symbol || ''),
          vol: doc.vol || '',
          class_no: this.cleanCDATA(doc.class_no || ''),
          class_nm: this.cleanCDATA(doc.class_nm || ''),
          bookImageURL: this.cleanCDATA(doc.bookImageURL || ''),
          bookDtlUrl: doc.bookDtlUrl || '',
          loan_count: Number(doc.loan_count) || 0,
        };
      });
    } catch (err: any) {
      console.error(`[Data4Library] searchBooks failed:`, err.message);
      return [];
    }
  }

  /**
   * 연령별 인기도서 10권 조회 (중복 제거)
   * - preschool: age=0;6 (영유아 + 유아)
   * - elementary: age=8 (초등)
   * - teen: age=14 (청소년)
   */
  async getPopularByAgeGroup(
    group: 'preschool' | 'elementary' | 'teen',
    limit: number = 10,
  ): Promise<Data4LibBook[]> {
    const ageMap: Record<string, string> = {
      preschool: '0;6',
      elementary: '8',
      teen: '14',
    };

    const ageCodes = ageMap[group];
    if (!ageCodes) return [];

    const books = await this.getPopularByAge(ageCodes, limit);
    return books;
  }

  private cleanCDATA(value: string): string {
    if (typeof value !== 'string') return String(value || '');
    return value
      .replace(/^<!\[CDATA\[/, '')
      .replace(/\]\]>$/, '')
      .trim();
  }
}

export const data4libraryService = new Data4LibraryService();
