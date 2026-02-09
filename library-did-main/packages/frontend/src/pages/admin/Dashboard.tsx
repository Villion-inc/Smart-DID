import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { BookCard } from '../../components/BookCard';
import { Button } from '../../components/Button';
import { Loading } from '../../components/Loading';
import { Badge } from '../../components/Badge';
import { LogOut, Video, Bell, BookOpen, Star } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { username, logout, isAuthenticated } = useAuthStore();
  const {
    newArrivals,
    librarianPicks,
    notifications,
    unreadCount,
    isLoading,
    loadNewArrivals,
    loadLibrarianPicks,
    loadNotifications,
    requestVideoGeneration,
    markAsRead,
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState<'new-arrivals' | 'librarian-picks'>('new-arrivals');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }

    loadNewArrivals();
    loadLibrarianPicks();
    loadNotifications();
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleRequestVideo = async (bookId: string) => {
    await requestVideoGeneration(bookId);
  };

  const currentBooks = activeTab === 'new-arrivals' ? newArrivals : librarianPicks;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
              <p className="text-sm text-gray-600">환영합니다, {username}님</p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/admin/videos')}
              >
                <Video className="w-5 h-5 mr-2" />
                영상 관리
              </Button>

              {unreadCount > 0 && (
                <div className="relative">
                  <Bell className="w-6 h-6 text-gray-600" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                </div>
              )}

              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="w-5 h-5 mr-2" />
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Notifications */}
        {notifications.filter((n) => !n.isRead).length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">알림</h3>
                <div className="space-y-2">
                  {notifications.filter((n) => !n.isRead).slice(0, 3).map((notification) => (
                    <div key={notification.id} className="flex items-start justify-between text-sm">
                      <p className="text-blue-800">{notification.message}</p>
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-blue-600 hover:text-blue-800 ml-4"
                      >
                        확인
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('new-arrivals')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'new-arrivals'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-5 h-5 inline mr-2" />
            신간 도서 ({newArrivals.length})
          </button>
          <button
            onClick={() => setActiveTab('librarian-picks')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'librarian-picks'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Star className="w-5 h-5 inline mr-2" />
            사서 추천 ({librarianPicks.length})
          </button>
        </div>

        {/* Books List */}
        {isLoading ? (
          <Loading text="도서 목록을 불러오는 중..." />
        ) : (
          <div className="space-y-4">
            {currentBooks.map((book) => (
              <div key={book.id} className="relative">
                <BookCard book={book} onClick={() => navigate(`/books/${book.id}`)} />
                <div className="absolute top-4 right-4">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestVideo(book.id);
                    }}
                  >
                    <Video className="w-4 h-4 mr-1" />
                    영상 생성
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
