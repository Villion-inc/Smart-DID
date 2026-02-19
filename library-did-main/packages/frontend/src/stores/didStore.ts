import { create } from 'zustand';
import { DidBook, DidBookDetail, DidMenuType, AgeGroup } from '../types';
import * as didApi from '../api/did.api';

/**
 * DID Store
 *
 * State management for Digital Information Display (DID) touch interface.
 * Handles book lists for different menus and caches results to minimize API calls.
 */

interface DidState {
  // Current active menu
  activeMenu: DidMenuType | null;

  // Book lists cached by menu type
  newArrivals: DidBook[];
  librarianPicks: DidBook[];
  preschoolBooks: DidBook[];
  elementaryBooks: DidBook[];
  teenBooks: DidBook[];

  // Current book detail
  currentBook: DidBookDetail | null;

  // Loading states
  isLoading: boolean;
  isLoadingDetail: boolean;

  // Error states
  error: string | null;

  // Actions
  setActiveMenu: (menu: DidMenuType | null) => void;
  fetchNewArrivals: () => Promise<void>;
  fetchLibrarianPicks: () => Promise<void>;
  fetchBooksByAge: (ageGroup: AgeGroup) => Promise<void>;
  fetchBookDetail: (bookId: string) => Promise<void>;
  clearCurrentBook: () => void;
  reset: () => void;
}

export const useDidStore = create<DidState>((set, get) => ({
  // Initial state
  activeMenu: null,
  newArrivals: [],
  librarianPicks: [],
  preschoolBooks: [],
  elementaryBooks: [],
  teenBooks: [],
  currentBook: null,
  isLoading: false,
  isLoadingDetail: false,
  error: null,

  // Set active menu
  setActiveMenu: (menu) => {
    set({ activeMenu: menu, error: null });
  },

  // Fetch new arrivals (with caching)
  fetchNewArrivals: async () => {
    // Return cached data if available
    if (get().newArrivals.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const books = await didApi.getNewArrivals();
      set({ newArrivals: books, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load new arrivals',
        isLoading: false
      });
    }
  },

  // Fetch librarian picks (with caching)
  fetchLibrarianPicks: async () => {
    // Return cached data if available
    if (get().librarianPicks.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const books = await didApi.getLibrarianPicks();
      set({ librarianPicks: books, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load librarian picks',
        isLoading: false
      });
    }
  },

  // Fetch books by age group (with caching)
  fetchBooksByAge: async (ageGroup: AgeGroup) => {
    // Check cache based on age group
    const state = get();
    let cached: DidBook[] = [];
    let stateKey: 'preschoolBooks' | 'elementaryBooks' | 'teenBooks';

    switch (ageGroup) {
      case 'preschool':
        cached = state.preschoolBooks;
        stateKey = 'preschoolBooks';
        break;
      case 'elementary':
        cached = state.elementaryBooks;
        stateKey = 'elementaryBooks';
        break;
      case 'teen':
        cached = state.teenBooks;
        stateKey = 'teenBooks';
        break;
    }

    // Return cached data if available
    if (cached.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const books = await didApi.getBooksByAge(ageGroup);
      set({ [stateKey]: books, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || `Failed to load ${ageGroup} books`,
        isLoading: false
      });
    }
  },

  // Fetch book detail (no caching - always fetch fresh)
  fetchBookDetail: async (bookId: string) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const book = await didApi.getDidBookDetail(bookId);
      set({ currentBook: book, isLoadingDetail: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to load book detail',
        isLoadingDetail: false,
        currentBook: null
      });
    }
  },

  // Clear current book
  clearCurrentBook: () => {
    set({ currentBook: null });
  },

  // Reset store
  reset: () => {
    set({
      activeMenu: null,
      newArrivals: [],
      librarianPicks: [],
      preschoolBooks: [],
      elementaryBooks: [],
      teenBooks: [],
      currentBook: null,
      isLoading: false,
      isLoadingDetail: false,
      error: null,
    });
  },
}));
