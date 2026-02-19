import { VideoStatus } from './video.types';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Video status response
 */
export interface VideoStatusResponse {
  status: VideoStatus;
  requestCount: number;
  rankingScore: number;
  lastRequestedAt?: string;
  videoUrl?: string;
  subtitleUrl?: string;
  expiresAt?: string;
}

/**
 * Video request response
 */
export interface VideoRequestResponse {
  status: VideoStatus;
  message: string;
}

/**
 * Recommendation item
 */
export interface RecommendationItem {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  coverImageUrl?: string;
  status: VideoStatus;
  requestCount: number;
  rankingScore: number;
  videoUrl?: string;
}

/**
 * Recommendation query params
 */
export interface RecommendationQuery {
  type?: 'video' | 'new_arrival' | 'librarian_pick' | 'bestseller';
  limit?: number;
}

/**
 * Video expiration update request
 */
export interface UpdateVideoExpirationRequest {
  expiresAt: string;
}
