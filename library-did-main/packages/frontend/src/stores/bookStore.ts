import { create } from 'zustand';
import { Book, VideoStatusResponse } from '../types';
import { bookApi } from '../api/book.api';

interface BookState {
  books: Book[];
  currentBook: Book | null;
  videoStatus: VideoStatusResponse | null;
  isLoading: boolean;
  error: string | null;
  searchBooks: (keyword?: string) => Promise<void>;
  getBookDetail: (bookId: string) => Promise<void>;
  getVideoStatus: (bookId: string) => Promise<void>;
  requestVideo: (bookId: string) => Promise<void>;
  clearCurrentBook: () => void;
}

export const useBookStore = create<BookState>((set) => ({
  books: [],
  currentBook: null,
  videoStatus: null,
  isLoading: false,
  error: null,

  searchBooks: async (keyword?: string) => {
    set({ isLoading: true, error: null });
    try {
      const books = await bookApi.searchBooks(keyword);
      set({ books, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to search books', isLoading: false });
    }
  },

  getBookDetail: async (bookId: string) => {
    set({ isLoading: true, error: null });
    try {
      const book = await bookApi.getBookDetail(bookId);
      set({ currentBook: book, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to load book', isLoading: false });
    }
  },

  getVideoStatus: async (bookId: string) => {
    try {
      const status = await bookApi.getVideoStatus(bookId);
      set({ videoStatus: status });
    } catch (error: any) {
      // Video record might not exist yet, that's okay
      set({ videoStatus: null });
    }
  },

  requestVideo: async (bookId: string) => {
    set({ isLoading: true, error: null });
    try {
      const status = await bookApi.requestVideo(bookId);
      set({ videoStatus: status, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to request video', isLoading: false });
    }
  },

  clearCurrentBook: () => {
    set({ currentBook: null, videoStatus: null, error: null });
  },
}));
