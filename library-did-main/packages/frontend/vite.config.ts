import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 도서관 서버 배포 시 10.10.11.13/METIS → base: '/METIS/'
const basePath = process.env.VITE_BASE_PATH;
const base = basePath ? basePath.replace(/\/?$/, '/') : '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
