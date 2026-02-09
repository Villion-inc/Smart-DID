/**
 * Fetch Book Candidates from Google Books API
 * Step 0.1 of the V2 Pipeline
 */

import axios from 'axios';
import { BookCandidate } from '../../shared/types';

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

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
