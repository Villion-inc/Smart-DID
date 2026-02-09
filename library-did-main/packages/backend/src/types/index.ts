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
  requestCount: number;
  lastRequestedAt: Date | null;
  expiresAt: Date | null;
  videoUrl: string | null;
  rankingScore: number;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  username: string;
  role: string;
}

export interface VideoUpdateRequest {
  expiresAt?: Date;
  status?: VideoStatus;
}

export interface ShelfMapPosition {
  bookId: string;
  shelfCode: string;
  mapX: number;
  mapY: number;
}

export interface NotificationData {
  type: string;
  message: string;
}
