import { create } from 'zustand';
import { authApi } from '../api/auth.api';

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  role: null,
  isAuthenticated: false,

  initialize: () => {
    const token = localStorage.getItem('auth_token');
    const username = localStorage.getItem('auth_username');
    const role = localStorage.getItem('auth_role');
    if (token) {
      set({ token, username, role, isAuthenticated: true });
    }
  },

  login: async (username: string, password: string) => {
    const response = await authApi.login(username, password);
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('auth_username', response.username);
    localStorage.setItem('auth_role', response.role);
    set({
      token: response.token,
      username: response.username,
      role: response.role,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_role');
    set({ token: null, username: null, role: null, isAuthenticated: false });
  },
}));
