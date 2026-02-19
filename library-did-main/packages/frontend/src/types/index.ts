export type VideoStatus = 'NONE' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED';

export interface Book {
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

export interface VideoStatusResponse {
  bookId: string;
  status: VideoStatus;
  requestCount?: number;
  lastRequestedAt?: string | null;
  expiresAt?: string | null;
  videoUrl: string | null;
  rankingScore?: number;
  message?: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// DID-specific types (Digital Information Display - Touch Interface)
export type AgeGroup = 'preschool' | 'elementary' | 'teen';

/**
 * Minimal book data optimized for DID touch screen display
 */
export interface DidBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl?: string;
  shelfCode: string;
  category: string;
}

/**
 * Detailed book data for DID detail screen
 * Excludes video-related fields as per DID requirements
 */
export interface DidBookDetail {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publishedYear: number;
  isbn: string;
  summary: string;
  shelfCode: string;
  callNumber: string;
  category: string;
  coverImageUrl?: string;
  isAvailable: boolean;
}

export type DidMenuType = 'new-arrivals' | 'librarian-picks' | 'age-preschool' | 'age-elementary' | 'age-teen';

// GenTA Theme types
export type ThemeType = 'adventure' | 'fairytale' | 'science' | 'comic' | 'history';

export const THEME_LABELS: Record<ThemeType, string> = {
  adventure: '모험',
  fairytale: '동화',
  science: '과학',
  comic: '만화',
  history: '역사',
};

// AI Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
