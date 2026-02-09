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

export class AlpasRealService {
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

    // Generate unique ID using book_key or reg_no
    const id = bookKey || regNo || `ALPAS_${Date.now()}_${index}`;

    return {
      id,
      title: this.cleanTitle(title),
      author: this.cleanAuthor(author),
      publisher: this.cleanText(publisher),
      publishedYear: this.parseYear(publishYear),
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
export const alpasRealService = new AlpasRealService();
