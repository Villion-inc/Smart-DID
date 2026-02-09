import { apiClient } from './client';
import { Book, ApiResponse, VideoStatusResponse } from '../types';

export const bookApi = {
  async searchBooks(keyword?: string): Promise<Book[]> {
    const response = await apiClient.get<ApiResponse<Book[]>>('/books', {
      params: keyword ? { keyword } : {},
    });
    return response.data.data!;
  },

  async getBookDetail(bookId: string): Promise<Book> {
    const response = await apiClient.get<ApiResponse<Book>>(`/books/${bookId}`);
    return response.data.data!;
  },

  async getVideoStatus(bookId: string): Promise<VideoStatusResponse> {
    const response = await apiClient.get<ApiResponse<VideoStatusResponse>>(
      `/books/${bookId}/video`
    );
    return response.data.data!;
  },

  async requestVideo(bookId: string): Promise<VideoStatusResponse> {
    const response = await apiClient.post<ApiResponse<VideoStatusResponse>>(
      `/books/${bookId}/video`
    );
    return response.data.data!;
  },
};
