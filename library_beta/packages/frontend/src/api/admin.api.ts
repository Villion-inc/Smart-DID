import { apiClient } from './client';
import { ApiResponse, Book, VideoStatusResponse, VideoStatus, Notification } from '../types';

// =====================
// Types
// =====================

export interface SeedResult {
  requested: number;
  skipped: number;
  failed?: number;
  details?: Array<{ title: string; status: string }>;
}

export interface SeedStatus {
  totalSeeded: number;
  ready: number;
  queued: number;
  generating: number;
  failed: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface WaitingJob {
  jobId: string;
  bookId: string;
  title: string;
  priority: number;
  addedAt: Date;
}

export interface CacheStats {
  totalVideos: number;
  totalSize: number;
  maxVideos: number;
  usagePercent: number;
  oldestVideo: string | null;
  newestVideo: string | null;
}

export interface CleanupResult {
  deleted: number;
  freedSpace: number;
  details: Array<{ bookId: string; reason: string }>;
}

export interface DashboardStats {
  videos: SeedStatus;
  queue: QueueStats;
  cache: CacheStats;
}

export const adminApi = {
  // =====================
  // Dashboard
  // =====================
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats');
    return response.data.data!;
  },

  // =====================
  // Recommendations
  // =====================
  async getNewArrivals(): Promise<Book[]> {
    const response = await apiClient.get<ApiResponse<Book[]>>('/admin/recommendations/new-arrivals');
    return response.data.data!;
  },

  async getLibrarianPicks(): Promise<Book[]> {
    const response = await apiClient.get<ApiResponse<Book[]>>('/admin/recommendations/librarian-picks');
    return response.data.data!;
  },

  // =====================
  // Video management
  // =====================
  async requestVideoGeneration(
    bookId: string,
    bookInfo?: { title?: string; author?: string }
  ): Promise<VideoStatusResponse> {
    const response = await apiClient.post<ApiResponse<VideoStatusResponse>>(
      `/admin/books/${bookId}/video`,
      bookInfo || {}
    );
    return response.data.data!;
  },

  async getVideos(status?: VideoStatus): Promise<VideoStatusResponse[]> {
    const response = await apiClient.get<ApiResponse<VideoStatusResponse[]>>(
      '/admin/videos',
      { params: status ? { status } : {} }
    );
    return response.data.data!;
  },

  async updateVideoExpiration(bookId: string, expiresAt: string): Promise<VideoStatusResponse> {
    const response = await apiClient.patch<ApiResponse<VideoStatusResponse>>(
      `/admin/books/${bookId}/video`,
      { expiresAt }
    );
    return response.data.data!;
  },

  async updateVideoStatus(bookId: string, status: VideoStatus): Promise<VideoStatusResponse> {
    const response = await apiClient.patch<ApiResponse<VideoStatusResponse>>(
      `/admin/books/${bookId}/video`,
      { status }
    );
    return response.data.data!;
  },

  // =====================
  // Bestseller Seed
  // =====================
  async seedBestsellers(limit: number = 100): Promise<SeedResult> {
    const response = await apiClient.post<ApiResponse<SeedResult>>(
      `/admin/seed/bestsellers?limit=${limit}`
    );
    return response.data.data!;
  },

  async seedByAgeGroup(ageGroup: 'preschool' | 'elementary' | 'teen', limit: number = 30): Promise<SeedResult> {
    const response = await apiClient.post<ApiResponse<SeedResult>>(
      `/admin/seed/age-group/${ageGroup}?limit=${limit}`
    );
    return response.data.data!;
  },

  async getSeedStatus(): Promise<SeedStatus> {
    const response = await apiClient.get<ApiResponse<SeedStatus>>('/admin/seed/status');
    return response.data.data!;
  },

  // =====================
  // Queue Management
  // =====================
  async getQueueStats(): Promise<QueueStats> {
    const response = await apiClient.get<ApiResponse<QueueStats>>('/admin/queue/stats');
    return response.data.data!;
  },

  async getWaitingJobs(limit: number = 20): Promise<WaitingJob[]> {
    const response = await apiClient.get<ApiResponse<WaitingJob[]>>(
      `/admin/queue/waiting?limit=${limit}`
    );
    return response.data.data!;
  },

  async cancelJob(bookId: string): Promise<{ message: string }> {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(
      `/admin/queue/${bookId}`
    );
    return response.data.data!;
  },

  async retryFailedJob(bookId: string): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/admin/queue/${bookId}/retry`
    );
    return response.data.data!;
  },

  // =====================
  // Cache Management
  // =====================
  async getCacheStats(): Promise<CacheStats> {
    const response = await apiClient.get<ApiResponse<CacheStats>>('/admin/cache/stats');
    return response.data.data!;
  },

  async cleanupStaleVideos(): Promise<CleanupResult> {
    const response = await apiClient.post<ApiResponse<CleanupResult>>('/admin/cache/cleanup');
    return response.data.data!;
  },

  // =====================
  // Notifications
  // =====================
  async getNotifications(params?: { take?: number; skip?: number; isRead?: boolean }) {
    const response = await apiClient.get<
      ApiResponse<{ notifications: Notification[]; unreadCount: number }>
    >('/admin/notifications', { params });
    return response.data.data!;
  },

  async markNotificationAsRead(id: string): Promise<Notification> {
    const response = await apiClient.patch<ApiResponse<Notification>>(
      `/admin/notifications/${id}/read`
    );
    return response.data.data!;
  },

  async markAllNotificationsAsRead(): Promise<{ count: number }> {
    const response = await apiClient.post<ApiResponse<{ count: number }>>(
      '/admin/notifications/mark-all-read'
    );
    return response.data.data!;
  },
};
