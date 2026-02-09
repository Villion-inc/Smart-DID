import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Home } from './pages/Home';
import { BookDetail } from './pages/BookDetail';
import { AdminLogin } from './pages/admin/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { VideoManagement } from './pages/admin/VideoManagement';
import { DidHome } from './pages/did/DidHome';
import { DidBookDetail } from './pages/did/DidBookDetail';

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

        {/* DID (Digital Information Display) Routes - Touch Interface */}
        <Route path="/did" element={<DidHome />} />
        <Route path="/did/books/:bookId" element={<DidBookDetail />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/videos" element={<VideoManagement />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
