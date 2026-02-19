/**
 * Video generation status
 */
export enum VideoStatus {
  NONE = 'NONE',
  QUEUED = 'QUEUED',
  GENERATING = 'GENERATING',
  READY = 'READY',
  FAILED = 'FAILED',
}

/**
 * Video record entity
 */
export interface VideoRecord {
  bookId: string;
  status: VideoStatus;
  videoUrl?: string;
  subtitleUrl?: string;
  requestCount: number;
  lastRequestedAt?: Date;
  retryCount: number;
  rankingScore: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  errorMessage?: string;
}

/**
 * Video scene information
 */
export interface VideoScene {
  sceneNumber: 1 | 2 | 3;
  duration: number;
  prompt: string;
  videoUrl?: string;
  subtitleText: string;
}

/**
 * Video generation job data
 */
export interface VideoJobData {
  bookId: string;
  title: string;
  author: string;
  summary: string;
  trigger: 'user_request' | 'admin_seed';
  retryCount?: number;
}

/**
 * Video generation result
 */
export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  subtitleUrl?: string;
  scenes?: VideoScene[];
  error?: string;
}
