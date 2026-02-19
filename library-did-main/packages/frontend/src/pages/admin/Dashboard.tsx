import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { adminApi } from '../../api/admin.api';
import { AdminLayout } from './AdminLayout';

const CARD_STYLE = {
  background: '#D9D9D9',
  boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
  borderRadius: 40,
};
const SECTION_TITLE = 'text-[20px] font-bold leading-tight text-black';
const BODY_TEXT = 'text-[16px] font-normal text-black';
const INPUT_BOX = 'w-full rounded-[30px] border border-[#E8E8E8] bg-[#FAF9F9] px-4 py-3 text-[16px]';

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

  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [stats, setStats] = useState<{
    totalCreated: number;
    usedCost: number;
    remainingBudget: number;
    canCreate: number;
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
      });
    } catch {
      setStats({
        totalCreated: 0,
        usedCost: 0,
        remainingBudget: 1_000_000,
        canCreate: 1000,
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
  };

  return (
    <AdminLayout title="BOOK MATE 관리자">
      <div className="px-4 pb-8 pt-5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        {/* 로그아웃 */}
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-black px-3 py-2 text-sm font-bold text-white"
          >
            로그아웃
          </button>
        </div>

        {/* 📒 API 사용 현황 */}
        <h2 className={`mb-2 ${SECTION_TITLE}`}>📒 API 사용 현황</h2>
        <div className="grid grid-cols-2 gap-2 gap-y-3">
          <div className="flex h-[70px] items-center rounded-[40px] px-3" style={CARD_STYLE}>
            <span className={`${BODY_TEXT} truncate`}>총 생성 수: {s.totalCreated}개</span>
          </div>
          <div className="flex h-[70px] items-center rounded-[40px] px-3" style={CARD_STYLE}>
            <span className={`${BODY_TEXT} truncate`}>사용 비용: {s.usedCost.toLocaleString()}원</span>
          </div>
          <div className="flex h-[70px] items-center rounded-[40px] px-3" style={CARD_STYLE}>
            <span className={`${BODY_TEXT} truncate`}>잔여 예산: {s.remainingBudget.toLocaleString()}원</span>
          </div>
          <div className="flex h-[70px] items-center rounded-[40px] px-3" style={CARD_STYLE}>
            <span className={`${BODY_TEXT} truncate`}>생성 가능: {s.canCreate}개</span>
          </div>
        </div>

        {/* ✨ 사서 추천 도서 추가 */}
        <h2 className={`mt-6 mb-2 ${SECTION_TITLE}`}>✨ 사서 추천 도서 추가</h2>
        <p className="mb-2 text-sm text-[#9F9F9F]">책 제목</p>
        <div className="flex flex-col gap-2">
          <input type="text" readOnly placeholder="" className={`h-[52px] ${INPUT_BOX}`} />
          <button
            type="button"
            onClick={() => navigate('/admin/recommend')}
            className="flex h-[58px] w-full items-center justify-center rounded-[40px] bg-black text-base font-bold text-white shadow"
            style={{ boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)' }}
          >
            + 추천도서 등록
          </button>
        </div>

        {/* 💘 인기 사용 책 */}
        <h2 className={`mt-6 mb-2 ${SECTION_TITLE}`}>💘 인기 사용 책</h2>
        <div className="rounded-[30px] border border-[#DBDBDB] bg-[#FAF9F9] p-3 min-h-[60px]">
          {librarianPicks.length === 0 ? (
            <p className="text-sm text-black">아직 생성 로그가 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {librarianPicks.slice(0, 5).map((book) => (
                <li key={book.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{book.title}</span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleRequestVideo(book.id)}
                    className="shrink-0 rounded-lg bg-black px-2 py-1 text-xs font-bold text-white"
                  >
                    영상 생성
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 📍 이용자 생성 로그 */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className={SECTION_TITLE}>📍 이용자 생성 로그</h2>
            <span className="text-xs text-black shrink-0">최신순/ 1회=1,000원</span>
          </div>
          <div className="rounded-[30px] border border-[#DBDBDB] bg-[#FAF9F9] p-3">
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={searchLogQuery}
                onChange={(e) => setSearchLogQuery(e.target.value)}
                placeholder="책 제목으로 로그 검색"
                className={`h-[44px] flex-1 ${INPUT_BOX} text-sm`}
              />
              <button
                type="button"
                className="h-[44px] w-12 shrink-0 rounded-[30px] border border-black bg-black text-lg font-bold text-white"
              >
                0
              </button>
            </div>
            <div className="rounded-xl border border-[#DBDBDB] bg-[#FAF9F9] min-h-[120px]">
              <div className="grid grid-cols-3 gap-1 border-b border-[#DBDBDB] px-2 py-2 text-xs font-bold text-black">
                <span>시간</span>
                <span>책</span>
                <span className="text-right">비용</span>
              </div>
              <p className="py-6 text-center text-sm text-black">로그가 없어요.</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs leading-snug text-[#FF0000]">
          실제 서비스에서는: 사용자/단말 ID, 세션, 도서 ISBN, 생성 상태, API 응답 시간 등 저장 가능
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/admin/videos')}
            className="w-full rounded-[40px] border-2 border-black py-2.5 text-sm font-bold text-black"
          >
            영상 관리
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};
