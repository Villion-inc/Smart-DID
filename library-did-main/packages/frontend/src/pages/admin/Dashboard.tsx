import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { adminApi, RecommendationData } from '../../api/admin.api';
import { AdminLayout } from './AdminLayout';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { loadVideos } = useAdminStore();

  const [stats, setStats] = useState<{
    totalCreated: number;
    usedCost: number;
    remainingBudget: number;
    canCreate: number;
    queued: number;
    generating: number;
  } | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    loadRecommendations();
    loadVideos();
    loadStats();
  }, [isAuthenticated, navigate]);

  const loadRecommendations = async () => {
    try {
      const data = await adminApi.getRecommendations();
      setRecommendations(data);
    } catch {
      setRecommendations([]);
    }
  };

  const loadStats = async () => {
    try {
      const [dashboard, queue] = await Promise.all([
        adminApi.getDashboardStats().catch(() => null),
        adminApi.getQueueStats().catch(() => null),
      ]);
      const ready = dashboard?.videos?.ready ?? 0;
      const completed = queue?.completed ?? 0;
      const costPerOne = 1000;
      const budget = 50_000;
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

  const s = stats ?? {
    totalCreated: 0,
    usedCost: 0,
    remainingBudget: 1_000_000,
    canCreate: 1000,
    queued: 0,
    generating: 0,
  };

  return (
    <AdminLayout>
      <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 py-4">
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
          
          {recommendations.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              등록된 추천 도서가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {recommendations.slice(0, 5).map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center rounded-xl bg-gray-50 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {rec.title}
                    </p>
                    <p className="truncate text-xs text-gray-500">{rec.author}</p>
                  </div>
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
