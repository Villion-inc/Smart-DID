import { RecommendationItem, ApiResponse } from '@smart-did/shared';
import { apiClient } from './client';
import { DidBook } from '../types';

export interface AiRecommendation {
  books: DidBook[];
  message: string;
}

export const recommendationApi = {
  async getRecommendations(limit: number = 20): Promise<RecommendationItem[]> {
    const response = await apiClient.get<ApiResponse<RecommendationItem[]>>(
      '/recommendations',
      { params: { type: 'video', limit } }
    );
    return response.data.data!;
  },

  /**
   * AI 도서 추천 요청
   * Gemini API를 통해 사용자 쿼리에 맞는 도서 추천
   */
  async getAiRecommendation(query: string): Promise<AiRecommendation> {
    const response = await apiClient.post<ApiResponse<AiRecommendation>>(
      '/recommendations/ai',
      { query }
    );
    return response.data.data!;
  },
};
