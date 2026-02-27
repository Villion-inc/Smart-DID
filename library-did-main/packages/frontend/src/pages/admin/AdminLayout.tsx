import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Admin 공통 레이아웃 - DID 스타일과 통일
 * - 파스텔 그라데이션 배경
 * - 깔끔한 헤더
 * - 하단 네비게이션
 */
export function AdminLayout({
  children,
  title = '관리자',
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/admin/dashboard';
  const isVideos = location.pathname === '/admin/videos';
  const isRecommend = location.pathname === '/admin/recommend';

  return (
    <div
      className="relative mx-auto flex flex-col overflow-hidden"
      style={{
        width: 450,
        height: 780,
        fontFamily: 'Pretendard, sans-serif',
        background: 'linear-gradient(180deg, #F0F4F8 0%, #E8ECF0 100%)',
      }}
    >
      {/* Header */}
      <header
        className="relative flex h-14 w-full shrink-0 items-center justify-center"
        style={{ background: 'rgba(45, 55, 72, 0.95)' }}
      >
        {/* 뒤로가기 버튼 - 절대 위치 */}
        {!isDashboard && (
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="absolute left-4 text-sm font-medium text-white/80 hover:text-white"
          >
            ← 뒤로
          </button>
        )}
        {/* 제목 - 항상 중앙 */}
        <h1 className="text-lg font-bold text-white">{title}</h1>
      </header>

      {/* Main content */}
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">
        {children}
      </main>

      {/* Bottom navigation */}
      <footer
        className="flex h-14 w-full shrink-0 items-center justify-center gap-2 px-4"
        style={{
          background: 'rgba(255,255,255,0.9)',
          borderTop: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition active:scale-95"
          style={{
            background: isDashboard ? '#2D3748' : '#F0F0F0',
            color: isDashboard ? '#fff' : '#666',
          }}
        >
          대시보드
        </button>
        <button
          type="button"
          onClick={() => navigate('/admin/videos')}
          className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition active:scale-95"
          style={{
            background: isVideos ? '#2D3748' : '#F0F0F0',
            color: isVideos ? '#fff' : '#666',
          }}
        >
          영상 관리
        </button>
        <button
          type="button"
          onClick={() => navigate('/admin/recommend')}
          className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-semibold transition active:scale-95"
          style={{
            background: isRecommend ? '#2D3748' : '#F0F0F0',
            color: isRecommend ? '#fff' : '#666',
          }}
        >
          도서 등록
        </button>
      </footer>
    </div>
  );
}
