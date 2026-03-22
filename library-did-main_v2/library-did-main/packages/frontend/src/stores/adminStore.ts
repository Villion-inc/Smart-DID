import { create } from 'zustand';
import { Book, VideoStatusResponse, VideoStatus, Notification } from '../types';
import { adminApi } from '../api/admin.api';

interface AdminState {
  newArrivals: Book[];
  librarianPicks: Book[];
  videos: VideoStatusResponse[];
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Recommendations
  loadNewArrivals: () => Promise<void>;
  loadLibrarianPicks: () => Promise<void>;

  // Video management
  requestVideoGeneration: (bookId: string, bookInfo?: { title?: string; author?: string }) => Promise<void>;
  loadVideos: (status?: VideoStatus) => Promise<void>;
  updateVideoExpiration: (bookId: string, expiresAt: string) => Promise<void>;
  updateVideoStatus: (bookId: string, status: VideoStatus) => Promise<void>;

  // Notifications
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  newArrivals: [],
  librarianPicks: [],
  videos: [],
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  loadNewArrivals: async () => {
    set({ isLoading: true, error: null });
    try {
      const books = await adminApi.getNewArrivals();
      set({ newArrivals: books, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to load new arrivals', isLoading: false });
    }
  },

  loadLibrarianPicks: async () => {
    set({ isLoading: true, error: null });
    try {
      const books = await adminApi.getLibrarianPicks();
      set({ librarianPicks: books, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to load librarian picks', isLoading: false });
    }
  },

  requestVideoGeneration: async (bookId: string, bookInfo?: { title?: string; author?: string }) => {
    set({ isLoading: true, error: null });
    try {
      await adminApi.requestVideoGeneration(bookId, bookInfo);
      set({ isLoading: false });
      // Reload videos to show updated status
      await get().loadVideos();
    } catch (error: any) {
      set({ error: error.message || 'Failed to request video generation', isLoading: false });
    }
  },

  loadVideos: async (status?: VideoStatus) => {
    set({ isLoading: true, error: null });
    try {
      const videos = await adminApi.getVideos(status);
      set({ videos, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to load videos', isLoading: false });
    }
  },

  updateVideoExpiration: async (bookId: string, expiresAt: string) => {
    set({ isLoading: true, error: null });
    try {
      await adminApi.updateVideoExpiration(bookId, expiresAt);
      set({ isLoading: false });
      // Reload videos to show updated data
      await get().loadVideos();
    } catch (error: any) {
      set({ error: error.message || 'Failed to update expiration', isLoading: false });
    }
  },

  updateVideoStatus: async (bookId: string, status: VideoStatus) => {
    set({ isLoading: true, error: null });
    try {
      await adminApi.updateVideoStatus(bookId, status);
      set({ isLoading: false });
      // Reload videos to show updated data
      await get().loadVideos();
    } catch (error: any) {
      set({ error: error.message || 'Failed to update status', isLoading: false });
    }
  },

  loadNotifications: async () => {
    try {
      const data = await adminApi.getNotifications({ take: 50 });
      set({
        notifications: data.notifications,
        unreadCount: data.unreadCount,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to load notifications' });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await adminApi.markNotificationAsRead(id);
      // Update local state
      const notifications = get().notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      set({ notifications, unreadCount });
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark as read' });
    }
  },

  markAllAsRead: async () => {
    try {
      await adminApi.markAllNotificationsAsRead();
      // Update local state
      const notifications = get().notifications.map((n) => ({ ...n, isRead: true }));
      set({ notifications, unreadCount: 0 });
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark all as read' });
    }
  },
}));
