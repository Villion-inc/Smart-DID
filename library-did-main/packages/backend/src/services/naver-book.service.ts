import { config } from '../config';

interface NaverBookItem {
  title: string;
  link: string;
  image: string;
  author: string;
  discount: string;
  publisher: string;
  pubdate: string;
  isbn: string;
  description: string;
}

interface NaverBookSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverBookItem[];
}

/**
 * 네이버 책 검색 API를 이용한 도서 표지 검색 서비스
 * - 제목 + 저자로 검색하여 표지 이미지 URL 반환
 * - Client ID/Secret 필요 (https://developers.naver.com)
 */
class NaverBookService {
  private clientId: string;
  private clientSecret: string;
  private baseUrl = 'https://openapi.naver.com/v1/search/book.json';

  constructor() {
    this.clientId = config.naver?.clientId || '';
    this.clientSecret = config.naver?.clientSecret || '';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * 제목 + 저자로 검색하여 가장 일치하는 책의 표지 URL 반환
   */
  async searchCoverImage(title: string, author?: string, publisher?: string): Promise<string | null> {
    if (!this.isConfigured()) {
      console.warn('[NaverBook] API keys not configured. Set NAVER_CLIENT_ID and NAVER_CLIENT_SECRET.');
      return null;
    }

    try {
      let query = title;
      if (author) query += ` ${author}`;
      if (publisher) query += ` ${publisher}`;
      const url = `${this.baseUrl}?query=${encodeURIComponent(query)}&display=5`;

      const response = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret,
        },
      });

      if (!response.ok) {
        console.error(`[NaverBook] API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = (await response.json()) as NaverBookSearchResponse;

      if (data.items.length === 0) {
        return null;
      }

      // 제목이 가장 일치하는 항목 찾기
      const cleanTitle = title.replace(/\s/g, '').toLowerCase();
      const best = data.items.find((item) => {
        const itemTitle = item.title.replace(/<[^>]*>/g, '').replace(/\s/g, '').toLowerCase();
        return itemTitle.includes(cleanTitle) || cleanTitle.includes(itemTitle);
      });

      const chosen = best || data.items[0];
      return chosen.image || null;
    } catch (error) {
      console.error('[NaverBook] Search failed:', error);
      return null;
    }
  }

  /**
   * 전체 검색 결과 반환 (프론트엔드에서 선택할 수 있도록)
   */
  async searchBooks(query: string, display: number = 5): Promise<NaverBookItem[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const url = `${this.baseUrl}?query=${encodeURIComponent(query)}&display=${display}`;

      const response = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as NaverBookSearchResponse;
      return data.items;
    } catch {
      return [];
    }
  }
}

export const naverBookService = new NaverBookService();
