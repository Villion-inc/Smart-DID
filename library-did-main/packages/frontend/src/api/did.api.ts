import { apiClient } from './client';
import { ApiResponse, DidBook, DidBookDetail, AgeGroup } from '../types';

/**
 * Video Status Response
 */
export interface VideoStatusResponse {
  bookId: string;
  status: 'NONE' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED';
  videoUrl: string | null;
  subtitleUrl?: string | null;
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
 * 새 DID 프론트(900×1600 북메이트 추천도서) ↔ 백엔드 연동.
 * baseURL = VITE_API_URL (예: http://localhost:3001/api). 모든 경로는 상대 경로.
 *
 * 백엔드 flow:
 * - GET /did/new-arrivals, /did/age/:group, /did/search, /did/books/:bookId → alpasService (Mock/Real)
 * - GET /did/books/:bookId/video → VideoRecord 상태/URL
 * - POST /did/books/:bookId/video/request → 없으면 큐 등록 후 Worker가 영상 생성, 콜백으로 DB 갱신
 * - 영상 재생 URL: backend가 저장한 videoUrl이 /api/videos/xxx 이면 origin + videoUrl 로 재생
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
  try {
    const response = await apiClient.get<ApiResponse<VideoStatusResponse>>(
      `/did/books/${bookId}/video`
    );
    return response.data.data ?? { bookId, status: 'NONE', videoUrl: null, message: '영상이 아직 생성되지 않았습니다.' };
  } catch (error) {
    console.error('getVideoStatus failed:', error);
    return { bookId, status: 'NONE', videoUrl: null, message: '영상이 아직 생성되지 않았습니다.' };
  }
};

/**
 * Request video generation for a book
 * - If READY: returns video URL immediately
 * - If QUEUED/GENERATING: returns current status
 * - If NONE/FAILED: adds to queue and returns QUEUED status
 * @param bookId - Book identifier
 * @param bookInfo - Optional book info (title, author, summary) to ensure correct video generation
 */
export const requestVideo = async (
  bookId: string,
  bookInfo?: { title?: string; author?: string; summary?: string }
): Promise<VideoStatusResponse> => {
  try {
    const response = await apiClient.post<ApiResponse<VideoStatusResponse>>(
      `/did/books/${bookId}/video/request`,
      bookInfo || {}
    );
    return response.data.data ?? { bookId, status: 'QUEUED', videoUrl: null, message: '영상 생성 요청이 접수되었습니다.' };
  } catch (error) {
    console.error('requestVideo failed:', error);
    throw error;
  }
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
  try {
    const response = await apiClient.get<ApiResponse<SearchResultWithVideo[]>>(
      `/did/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data.data || [];
  } catch (error) {
    console.error('searchBooksWithVideo failed:', error);
    return [];
  }
};
