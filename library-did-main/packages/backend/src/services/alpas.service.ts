import axios from 'axios';
import { Book } from '../types';

/**
 * Real ALPAS API Service
 *
 * Connects to actual ALPAS library system API.
 * Uses test server: http://www.alpas.kr
 * Network Adapter ID: 1 (test environment)
 *
 * APIs used:
 * - AD201: Book search
 * - AD206: Book detail
 * - AE117: New arrivals
 */

const ALPAS_BASE_URL = 'http://www.alpas.kr/BTLMS/HOMEPAGE/API';
const NETWORK_ADAPTER_ID = '1';
const MANAGE_CODE = 'MA'; // 행복도서관

interface AlpasSearchResponse {
  statusDescription: string;
  fetchCount: string;
  searchList: AlpasBook[];
}

interface AlpasBook {
  TITLE?: string;
  title?: string;
  AUTHOR?: string;
  author?: string;
  PUBLISHER?: string;
  publisher?: string;
  PUBLISH_YEAR?: string;
  publish_year?: string;
  EA_ISBN?: string;
  ea_isbn?: string;
  CALL_NO?: string;
  call_no?: string;
  CLASS_NO?: string;
  class_no?: string;
  SHELF_LOC_CODE_DESC?: string;
  shelf_loc_code_desc?: string;
  BOOK_KEY?: string;
  book_key?: string;
  REG_NO?: string;
  reg_no?: string;
  loan_able?: string;
  LOAN_ABLE?: string;
  USE_LIMIT_CODE_DESC?: string;
}

export class AlpasService {
  /**
   * Map ALPAS API response to internal Book model
   */
  private mapToBook(alpasBook: AlpasBook, index: number): Book {
    const title = alpasBook.TITLE || alpasBook.title || '제목 없음';
    const author = alpasBook.AUTHOR || alpasBook.author || '저자 미상';
    const publisher = alpasBook.PUBLISHER || alpasBook.publisher || '출판사 미상';
    const publishYear = alpasBook.PUBLISH_YEAR || alpasBook.publish_year || '';
    const isbn = alpasBook.EA_ISBN || alpasBook.ea_isbn || '';
    const callNumber = alpasBook.CALL_NO || alpasBook.call_no || '';
    const shelfCode = alpasBook.SHELF_LOC_CODE_DESC || alpasBook.shelf_loc_code_desc || '';
    const bookKey = alpasBook.BOOK_KEY || alpasBook.book_key || '';
    const regNo = alpasBook.REG_NO || alpasBook.reg_no || '';
    const loanAble = alpasBook.loan_able || alpasBook.LOAN_ABLE || 'N';
    const category = alpasBook.USE_LIMIT_CODE_DESC || '일반';
    const classNo = alpasBook.CLASS_NO || alpasBook.class_no || '';

    // Generate unique ID using book_key or reg_no
    const id = bookKey || regNo || `ALPAS_${Date.now()}_${index}`;

    // Create rich summary from ALPAS metadata
    const summary = this.generateSummary(
      this.cleanTitle(title),
      this.cleanAuthor(author),
      this.cleanText(publisher),
      this.parseYear(publishYear),
      category,
      classNo
    );

    // Use ISBN-based cover if available, otherwise use category-based placeholder
    const coverUrl = isbn ? `https://via.placeholder.com/300x400/3B82F6/FFFFFF?text=${encodeURIComponent(this.cleanTitle(title).slice(0, 20))}` :
                            `https://via.placeholder.com/300x400/6366F1/FFFFFF?text=No+Cover`;

    return {
      id,
      title: this.cleanTitle(title),
      author: this.cleanAuthor(author),
      publisher: this.cleanText(publisher),
      publishedYear: this.parseYear(publishYear),
      isbn: isbn.replace(/[^0-9]/g, ''),
      summary,
      callNumber,
      registrationNumber: regNo,
      shelfCode: this.cleanShelfCode(shelfCode),
      isAvailable: loanAble === 'Y',
      coverImageUrl: coverUrl,
      category,
    };
  }

  /**
   * Generate rich summary from ALPAS metadata
   */
  private generateSummary(
    title: string,
    author: string,
    publisher: string,
    year: number,
    category: string,
    classNo: string
  ): string {
    const parts: string[] = [];

    // Add title and author
    parts.push(`『${title}』는 ${author}이(가) 저술한 도서입니다.`);

    // Add publisher and year
    if (publisher && year) {
      parts.push(`${publisher}에서 ${year}년에 출판하였습니다.`);
    }

    // Add category info
    if (category && category !== '일반') {
      parts.push(`이 책은 ${category} 자료입니다.`);
    }

    // Add classification info
    if (classNo) {
      const classInfo = this.getClassificationInfo(classNo);
      if (classInfo) {
        parts.push(classInfo);
      }
    }

    parts.push('상세한 내용은 도서관에서 직접 확인해주세요.');

    return parts.join(' ');
  }

  /**
   * Get human-readable classification info from class number
   */
  private getClassificationInfo(classNo: string): string | null {
    const num = parseInt(classNo, 10);
    if (isNaN(num)) return null;

    if (num >= 0 && num < 100) return '총류(백과사전, 도서관학 등) 분야입니다.';
    if (num >= 100 && num < 200) return '철학 분야입니다.';
    if (num >= 200 && num < 300) return '종교 분야입니다.';
    if (num >= 300 && num < 400) return '사회과학 분야입니다.';
    if (num >= 400 && num < 500) return '자연과학 분야입니다.';
    if (num >= 500 && num < 600) return '기술과학 분야입니다.';
    if (num >= 600 && num < 700) return '예술 분야입니다.';
    if (num >= 700 && num < 800) return '언어 분야입니다.';
    if (num >= 800 && num < 900) return '문학 분야입니다.';
    if (num >= 900) return '역사 분야입니다.';

    return null;
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
   * Search books by keyword
   */
  async searchBooks(keyword: string): Promise<Book[]> {
    try {
      if (!keyword || keyword.trim() === '') {
        // Return recent books if no keyword
        return await this.getNewArrivals();
      }

      const response = await axios.get<AlpasSearchResponse>(
        `${ALPAS_BASE_URL}/AD201.do`,
        {
          params: {
            networkadapterid: NETWORK_ADAPTER_ID,
            manage_code: MANAGE_CODE,
            title: keyword,
          },
          timeout: 10000,
        }
      );

      if (response.data.searchList && Array.isArray(response.data.searchList)) {
        return response.data.searchList.map((book, index) => this.mapToBook(book, index));
      }

      return [];
    } catch (error: any) {
      console.error('ALPAS API search error:', error.message);
      return [];
    }
  }

  /**
   * Get book details by ID
   */
  async getBookDetail(bookId: string): Promise<Book | null> {
    try {
      // First try to search by title to find the book
      // Since we don't have a direct book detail API by ID in the test environment
      const searchResponse = await axios.get<AlpasSearchResponse>(
        `${ALPAS_BASE_URL}/AD201.do`,
        {
          params: {
            networkadapterid: NETWORK_ADAPTER_ID,
            manage_code: MANAGE_CODE,
            book_key: bookId,
          },
          timeout: 10000,
        }
      );

      if (searchResponse.data.searchList && searchResponse.data.searchList.length > 0) {
        return this.mapToBook(searchResponse.data.searchList[0], 0);
      }

      return null;
    } catch (error: any) {
      console.error('ALPAS API book detail error:', error.message);
      return null;
    }
  }

  /**
   * Get new arrival books
   */
  async getNewArrivals(): Promise<Book[]> {
    try {
      // Get books from last 2 years
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);

      const formatDate = (date: Date) => {
        return date.toISOString().slice(0, 10).replace(/-/g, '');
      };

      const response = await axios.get<AlpasSearchResponse>(
        `${ALPAS_BASE_URL}/AE117.do`,
        {
          params: {
            networkadapterid: NETWORK_ADAPTER_ID,
            manage_code: MANAGE_CODE,
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
          },
          timeout: 10000,
        }
      );

      if (response.data.searchList && Array.isArray(response.data.searchList)) {
        // Return first 10 books
        return response.data.searchList
          .slice(0, 10)
          .map((book, index) => this.mapToBook(book, index));
      }

      return [];
    } catch (error: any) {
      console.error('ALPAS API new arrivals error:', error.message);
      return [];
    }
  }

  /**
   * Get librarian recommended books
   * Note: Using popular/frequently borrowed books as recommendation
   */
  async getLibrarianPicks(): Promise<Book[]> {
    try {
      // Search for classic children's literature
      const keywords = ['어린왕자', '이상한나라', '해리포터'];
      const allBooks: Book[] = [];

      for (const keyword of keywords) {
        const response = await axios.get<AlpasSearchResponse>(
          `${ALPAS_BASE_URL}/AD201.do`,
          {
            params: {
              networkadapterid: NETWORK_ADAPTER_ID,
              manage_code: MANAGE_CODE,
              title: keyword,
            },
            timeout: 10000,
          }
        );

        if (response.data.searchList && response.data.searchList.length > 0) {
          // Take first result from each search
          allBooks.push(this.mapToBook(response.data.searchList[0], allBooks.length));
        }
      }

      return allBooks;
    } catch (error: any) {
      console.error('ALPAS API librarian picks error:', error.message);
      return [];
    }
  }

  /**
   * Get books by age group
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
        const response = await axios.get<AlpasSearchResponse>(
          `${ALPAS_BASE_URL}/AD201.do`,
          {
            params: {
              networkadapterid: NETWORK_ADAPTER_ID,
              manage_code: MANAGE_CODE,
              title: keyword,
            },
            timeout: 10000,
          }
        );

        if (response.data.searchList && Array.isArray(response.data.searchList)) {
          // Take first 5 results from each search
          const books = response.data.searchList
            .slice(0, 5)
            .map((book, index) => this.mapToBook(book, allBooks.length + index));
          allBooks.push(...books);
        }
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
export const alpasService = new AlpasService();
