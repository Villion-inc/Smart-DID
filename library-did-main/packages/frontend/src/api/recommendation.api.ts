import { RecommendationItem, ApiResponse } from '@smart-did/shared';
import { apiClient } from './client';

export const recommendationApi = {
  async getRecommendations(limit: number = 20): Promise<RecommendationItem[]> {
    const response = await apiClient.get<ApiResponse<RecommendationItem[]>>(
      '/recommendations',
      { params: { type: 'video', limit } }
    );
    return response.data.data!;
  },
};
