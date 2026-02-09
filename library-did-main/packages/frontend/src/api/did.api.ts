import { apiClient } from './client';
import { ApiResponse, DidBook, DidBookDetail, AgeGroup } from '../types';

/**
 * Video Status Response
 */
export interface VideoStatusResponse {
  bookId: string;
  status: 'NONE' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED';
  videoUrl: string | null;
  message: string;
  queuePosition?: number;
}

/**
 * Search Result with Video Status
 */
export interface SearchResultWithVideo extends DidBook {
  videoStatus: 'NONE' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED';
  hasVideo: boolean;
}

/**
 * Popular Video Item
 */
export interface PopularVideo {
  bookId: string;
  title: string;
  author: string;
  coverImageUrl?: string;
  videoUrl: string;
  requestCount: number;
  rankingScore: number;
}

/**
 * DID API Client
 *
 * Handles API calls for the Digital Information Display (DID) touch interface.
 * All endpoints are public (no authentication required).
 */

/**
 * Fetch newly arrived books for DID display
 */
export const getNewArrivals = async (): Promise<DidBook[]> => {
  const response = await apiClient.get<ApiResponse<DidBook[]>>('/did/new-arrivals');
  return response.data.data || [];
};

/**
 * Fetch librarian recommended books for DID display
 */
export const getLibrarianPicks = async (): Promise<DidBook[]> => {
  const response = await apiClient.get<ApiResponse<DidBook[]>>('/did/librarian-picks');
  return response.data.data || [];
};

/**
 * Fetch books by age group for DID display
 * @param ageGroup - 'preschool' | 'elementary' | 'teen'
 */
export const getBooksByAge = async (ageGroup: AgeGroup): Promise<DidBook[]> => {
  const response = await apiClient.get<ApiResponse<DidBook[]>>(`/did/age/${ageGroup}`);
  return response.data.data || [];
};

/**
 * Fetch detailed book information for DID detail screen
 * @param bookId - Book identifier
 */
export const getDidBookDetail = async (bookId: string): Promise<DidBookDetail | null> => {
  try {
    const response = await apiClient.get<ApiResponse<DidBookDetail>>(`/did/books/${bookId}`);
    return response.data.data || null;
  } catch (error) {
    console.error('Failed to fetch book detail:', error);
    return null;
  }
};

// =====================
// Video APIs
// =====================

/**
 * Get video status for a book
 * @param bookId - Book identifier
 */
export const getVideoStatus = async (bookId: string): Promise<VideoStatusResponse> => {
  const response = await apiClient.get<ApiResponse<VideoStatusResponse>>(
    `/did/books/${bookId}/video`
  );
  return response.data.data!;
};

/**
 * Request video generation for a book
 * - If READY: returns video URL immediately
 * - If QUEUED/GENERATING: returns current status
 * - If NONE/FAILED: adds to queue and returns QUEUED status
 * @param bookId - Book identifier
 */
export const requestVideo = async (bookId: string): Promise<VideoStatusResponse> => {
  const response = await apiClient.post<ApiResponse<VideoStatusResponse>>(
    `/did/books/${bookId}/video/request`
  );
  return response.data.data!;
};

/**
 * Get popular videos (ranked by views)
 * @param limit - Maximum number of videos to return
 */
export const getPopularVideos = async (limit: number = 20): Promise<PopularVideo[]> => {
  const response = await apiClient.get<ApiResponse<PopularVideo[]>>(
    `/did/videos/popular?limit=${limit}`
  );
  return response.data.data || [];
};

/**
 * Search books with video status
 * @param query - Search keyword
 * @param limit - Maximum number of results
 */
export const searchBooksWithVideo = async (
  query: string,
  limit: number = 20
): Promise<SearchResultWithVideo[]> => {
  const response = await apiClient.get<ApiResponse<SearchResultWithVideo[]>>(
    `/did/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return response.data.data || [];
};
