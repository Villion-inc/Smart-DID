import { apiClient } from './client';
import { ApiResponse, AuthResponse } from '../types';

export const authApi = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', {
      username,
      password,
    });
    return response.data.data!;
  },

  async getMe() {
    const response = await apiClient.get<ApiResponse<{ id: string; username: string; role: string }>>('/auth/me');
    return response.data.data!;
  },
};
