/**
 * Fetch Book Candidates from Google Books API & Alpas API
 * Step 0.1 of the V2 Pipeline
 *
 * Alpas (via Backend internal API) is the PRIMARY source for library book info.
 * Google Books is the SECONDARY source for enrichment/validation.
 */

import axios from 'axios';
import { BookCandidate } from '../../shared/types';
import { config } from '../../config';

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
const NAVER_BOOKS_API_URL = 'https://openapi.naver.com/v1/search/book.json';

/** Alpas Book shape returned from backend internal API */
interface AlpasBookResult {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number;
  isbn: string;
  summary: string;
  callNumber: string;
  registrationNumber: string;
  shelfCode: string;
  isAvailable: boolean;
  coverImageUrl?: string;
  category: string;
}

/**
 * Fetch book candidates from Alpas via Backend internal API
 * @param title Book title to search for
 * @param author Optional author name (currently unused by Alpas search, but kept for future)
 * @returns Array of BookCandidate transformed from Alpas results
 */
export async function fetchFromAlpas(
  title: string,
  author?: string,
): Promise<BookCandidate[]> {
  const backendUrl = config.backendUrl.replace(/\/$/, '');
  const secret = config.internalApiSecret;
  const params = new URLSearchParams({ title });
  if (author) params.set('author', author);

  const url = `${backendUrl}/api/internal/book-search?${params.toString()}`;
  console.log(`[Grounding/Alpas] Fetching from: ${url}`);

  try {
    const response = await axios.get<{ success: boolean; data: AlpasBookResult[] }>(url, {
      timeout: 15000,
      headers: { 'X-Internal-Secret': secret },
    });

    const books = response.data?.data;
    if (!Array.isArray(books) || books.length === 0) {
      console.log('[Grounding/Alpas] No results');
      return [];
    }

    console.log(`[Grounding/Alpas] Got ${books.length} results`);
    return books.map((b) => ({
      id: b.id,
      title: b.title,
      authors: [b.author],
      publishedDate: String(b.publishedYear),
      description: b.summary,
      categories: b.category ? [b.category] : undefined,
      language: 'ko',
      thumbnail: b.coverImageUrl,
    }));
  } catch (error: any) {
    console.error(`[Grounding/Alpas] Error: ${error.message}`);
    return [];
  }
}

/** Naver Book Search API response shape */
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

interface NaverBookResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverBookItem[];
}

/**
 * Fetch book candidates from Naver Book Search API
 * PRIMARY source for Korean book descriptions (줄거리)
 */
export async function fetchFromNaver(
  title: string,
  author?: string,
): Promise<BookCandidate[]> {
  const { clientId, clientSecret } = config.naver;
  if (!clientId || !clientSecret) {
    console.log('[Grounding/Naver] API keys not configured, skipping');
    return [];
  }

  const query = author ? `${title} ${author}` : title;
  const url = `${NAVER_BOOKS_API_URL}?query=${encodeURIComponent(query)}&display=5`;

  console.log(`[Grounding/Naver] Searching: "${query}"`);

  try {
    const response = await axios.get<NaverBookResponse>(url, {
      timeout: 10000,
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    const items = response.data?.items;
    if (!Array.isArray(items) || items.length === 0) {
      console.log('[Grounding/Naver] No results');
      return [];
    }

    console.log(`[Grounding/Naver] Got ${items.length} results`);

    return items.map((item) => {
      // Strip HTML tags from Naver response fields
      const cleanTitle = item.title.replace(/<[^>]*>/g, '');
      const cleanAuthor = item.author.replace(/<[^>]*>/g, '');
      const cleanDescription = item.description.replace(/<[^>]*>/g, '');

      return {
        id: `naver-${item.isbn || encodeURIComponent(cleanTitle)}`,
        title: cleanTitle,
        authors: cleanAuthor ? [cleanAuthor] : ['Unknown Author'],
        publishedDate: item.pubdate,
        description: cleanDescription,
        language: 'ko',
        thumbnail: item.image || undefined,
      };
    });
  } catch (error: any) {
    console.error(`[Grounding/Naver] Error: ${error.message}`);
    return [];
  }
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const status = error.response?.status || error.status;
      if (status === 429 && i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`[Grounding] Rate limited, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
  };
  infoLink?: string;
  averageRating?: number;
  ratingsCount?: number;
}

interface GoogleBooksItem {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksItem[];
}

/**
 * Fetch book candidates from Google Books API
 * @param title Book title to search for
 * @param author Optional author name to narrow search
 * @param maxResults Maximum number of results to fetch
 * @returns Array of book candidates
 */
export async function fetchCandidates(
  title: string,
  author?: string,
  maxResults: number = 10
): Promise<BookCandidate[]> {
  // Build search query
  let query = `intitle:${encodeURIComponent(title)}`;
  if (author) {
    query += `+inauthor:${encodeURIComponent(author)}`;
  }

  const url = `${GOOGLE_BOOKS_API_URL}?q=${query}&maxResults=${maxResults}&printType=books`;

  console.log(`[Grounding] Fetching candidates for: "${title}"${author ? ` by ${author}` : ''}`);

  try {
    const response = await retryWithBackoff(async () => {
      return await axios.get<GoogleBooksResponse>(url, {
        timeout: 10000,
      });
    });

    if (!response.data.items || response.data.items.length === 0) {
      console.log('[Grounding] No candidates found, trying broader search...');

      // Try broader search without intitle
      const broadUrl = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(title)}${author ? `+${encodeURIComponent(author)}` : ''}&maxResults=${maxResults}&printType=books`;
      const broadResponse = await retryWithBackoff(async () => {
        return await axios.get<GoogleBooksResponse>(broadUrl, {
          timeout: 10000,
        });
      });

      if (!broadResponse.data.items || broadResponse.data.items.length === 0) {
        console.log('[Grounding] No candidates found in broader search');
        return [];
      }

      return transformGoogleBooksResponse(broadResponse.data.items);
    }

    return transformGoogleBooksResponse(response.data.items);
  } catch (error: any) {
    console.error(`[Grounding] Error fetching candidates: ${error.message}`);
    throw new Error(`Failed to fetch book candidates: ${error.message}`);
  }
}

/**
 * Transform Google Books API response to BookCandidate array
 */
function transformGoogleBooksResponse(items: GoogleBooksItem[]): BookCandidate[] {
  return items.map((item) => {
    const info = item.volumeInfo;
    return {
      id: item.id,
      title: info.title || 'Unknown Title',
      authors: info.authors || ['Unknown Author'],
      publishedDate: info.publishedDate,
      description: info.description,
      pageCount: info.pageCount,
      categories: info.categories,
      language: info.language,
      thumbnail: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail,
      infoLink: info.infoLink,
      averageRating: info.averageRating,
      ratingsCount: info.ratingsCount,
    };
  });
}

/**
 * Fetch a specific book by Google Books ID
 * @param bookId Google Books volume ID
 * @returns BookCandidate or null if not found
 */
export async function fetchBookById(bookId: string): Promise<BookCandidate | null> {
  const url = `${GOOGLE_BOOKS_API_URL}/${bookId}`;

  try {
    const response = await axios.get<GoogleBooksItem>(url, {
      timeout: 10000,
    });

    const info = response.data.volumeInfo;
    return {
      id: response.data.id,
      title: info.title || 'Unknown Title',
      authors: info.authors || ['Unknown Author'],
      publishedDate: info.publishedDate,
      description: info.description,
      pageCount: info.pageCount,
      categories: info.categories,
      language: info.language,
      thumbnail: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail,
      infoLink: info.infoLink,
      averageRating: info.averageRating,
      ratingsCount: info.ratingsCount,
    };
  } catch (error: any) {
    console.error(`[Grounding] Error fetching book by ID: ${error.message}`);
    return null;
  }
}
