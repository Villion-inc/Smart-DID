import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { adminApi } from '../../api/admin.api';
import { AdminLayout } from './AdminLayout';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuthStore();
  const {
    librarianPicks,
    loadNewArrivals,
    loadLibrarianPicks,
    loadVideos,
    requestVideoGeneration,
  } = useAdminStore();

  const [stats, setStats] = useState<{
    totalCreated: number;
    usedCost: number;
    remainingBudget: number;
    canCreate: number;
    queued: number;
    generating: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    loadNewArrivals();
    loadLibrarianPicks();
    loadVideos();
    loadStats();
  }, [isAuthenticated, navigate]);

  const loadStats = async () => {
    try {
      const [dashboard, queue] = await Promise.all([
        adminApi.getDashboardStats().catch(() => null),
        adminApi.getQueueStats().catch(() => null),
      ]);
      const ready = dashboard?.videos?.ready ?? 0;
      const completed = queue?.completed ?? 0;
      const costPerOne = 1000;
      const budget = 1_000_000;
      const usedCost = completed * costPerOne;
      const remainingBudget = Math.max(0, budget - usedCost);
      setStats({
        totalCreated: ready,
        usedCost,
        remainingBudget,
        canCreate: Math.floor(remainingBudget / costPerOne),
        queued: queue?.waiting ?? 0,
        generating: queue?.active ?? 0,
      });
    } catch {
      setStats({
        totalCreated: 0,
        usedCost: 0,
        remainingBudget: 1_000_000,
        canCreate: 1000,
        queued: 0,
        generating: 0,
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleRequestVideo = async (bookId: string) => {
    setLoading(true);
    try {
      await requestVideoGeneration(bookId);
      await loadStats();
    } finally {
      setLoading(false);
    }
  };

  const s = stats ?? {
    totalCreated: 0,
    usedCost: 0,
    remainingBudget: 1_000_000,
    canCreate: 1000,
    queued: 0,
    generating: 0,
  };

  return (
    <AdminLayout title="대시보드">
      <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 py-4">
        {/* 로그아웃 버튼 */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-300"
          >
            로그아웃
          </button>
        </div>

        {/* API 사용 현황 */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <h2 className="mb-3 text-base font-bold text-gray-800">
            API 사용 현황
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-xs text-blue-600">총 생성 영상</p>
              <p className="text-xl font-bold text-blue-700">{s.totalCreated}개</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3">
              <p className="text-xs text-green-600">잔여 예산</p>
              <p className="text-xl font-bold text-green-700">
                {s.remainingBudget.toLocaleString()}원
              </p>
            </div>
            <div className="rounded-xl bg-orange-50 p-3">
              <p className="text-xs text-orange-600">대기중</p>
              <p className="text-xl font-bold text-orange-700">{s.queued}개</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-3">
              <p className="text-xs text-purple-600">생성중</p>
              <p className="text-xl font-bold text-purple-700">{s.generating}개</p>
            </div>
          </div>
          <p className="mt-2 text-right text-xs text-gray-400">
            1회 생성 = 1,000원 / 생성 가능: {s.canCreate}개
          </p>
        </div>

        {/* 사서 추천 도서 */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">추천 도서 목록</h2>
            <button
              type="button"
              onClick={() => navigate('/admin/recommend')}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white"
            >
              + 도서 등록
            </button>
          </div>
          
          {librarianPicks.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              등록된 추천 도서가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {librarianPicks.slice(0, 5).map((book) => (
                <div
                  key={book.id}
                  className="flex items-center justify-between rounded-xl bg-gray-50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {book.title}
                    </p>
                    <p className="truncate text-xs text-gray-500">{book.author}</p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleRequestVideo(book.id)}
                    className="ml-2 shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    영상 생성
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 빠른 작업 */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <h2 className="mb-3 text-base font-bold text-gray-800">빠른 작업</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/videos')}
              className="flex h-12 items-center justify-center rounded-xl bg-gray-100 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              영상 목록 보기
            </button>
            <button
              type="button"
              onClick={() => navigate('/did')}
              className="flex h-12 items-center justify-center rounded-xl bg-gray-100 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              DID 화면 보기
            </button>
          </div>
        </div>

        {/* 안내 문구 */}
        <p className="text-center text-xs text-gray-400">
          영상 생성 요청 시 Worker가 자동으로 처리합니다.
        </p>
      </div>
    </AdminLayout>
  );
};
