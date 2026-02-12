import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Home } from './pages/Home';
import { BookDetail } from './pages/BookDetail';
import { AdminLogin } from './pages/admin/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminRecommendBook } from './pages/admin/AdminRecommendBook';
import { VideoManagement } from './pages/admin/VideoManagement';
import { DidV2Home } from './pages/did/DidV2Home';
import { DidV2BookGrid } from './pages/did/DidV2BookGrid';
import { DidV2BookDetail } from './pages/did/DidV2BookDetail';
import { DidV2NewArrivals } from './pages/did/DidV2NewArrivals';
import { DidV2Search } from './pages/did/DidV2Search';
import { DidV2Location } from './pages/did/DidV2Location';

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/books/:bookId" element={<BookDetail />} />

        {/* DID - 900×1600 북메이트 추천도서 (Frame 12~23) */}
        <Route path="/did" element={<DidV2Home />} />
        <Route path="/did/age/:group" element={<DidV2BookGrid />} />
        <Route path="/did/video/:bookId" element={<DidV2BookDetail />} />
        <Route path="/did/new" element={<DidV2NewArrivals />} />
        <Route path="/did/search" element={<DidV2Search />} />
        <Route path="/did/location/:bookId" element={<DidV2Location />} />

        {/* 프로토타입: /pip → 책 미리보기 */}
        <Route path="/pip" element={<Navigate to="/did/video/BK001" replace />} />
        <Route path="/pip/:bookId" element={<DidV2BookDetail />} />

        {/* Admin Routes - DID와 동일 뷰포트(480px) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/recommend" element={<AdminRecommendBook />} />
        <Route path="/admin/videos" element={<VideoManagement />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
