import { create } from 'zustand';
import type { SearchResultWithVideo } from '../api/did.api';

/**
 * 검색 결과 캐시 — 뒤로가기 시 검색 화면 복원용
 * 도서 상세에서 뒤로 가면 이전 검색어·결과를 그대로 보여줌
 */
interface SearchCacheState {
  query: string;
  results: SearchResultWithVideo[];
  setCache: (query: string, results: SearchResultWithVideo[]) => void;
  clearCache: () => void;
}

export const useSearchCacheStore = create<SearchCacheState>((set) => ({
  query: '',
  results: [],

  setCache: (query, results) => {
    set({ query, results });
  },

  clearCache: () => {
    set({ query: '', results: [] });
  },
}));
