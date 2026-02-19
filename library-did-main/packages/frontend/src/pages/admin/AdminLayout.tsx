import { useNavigate, useLocation } from 'react-router-dom';

const LAYOUT_STYLE = {
  fontFamily: 'Pretendard, sans-serif',
  maxWidth: 480,
  minHeight: '100vh',
  backgroundColor: '#FFFFFF',
};

/**
 * Admin 공통 레이아웃 - DID와 동일 뷰포트 (480px)
 * 상단 헤더: BOOK MATE 관리자 (검정 배경)
 */
export function AdminLayout({
  children,
  title = 'BOOK MATE 관리자',
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/admin/dashboard';

  return (
    <div
      className="relative mx-auto flex w-full flex-col bg-white"
      style={{ ...LAYOUT_STYLE }}
    >
      {/* Header - 검정 바 (Frame 17 스펙) */}
      <header
        className="relative flex h-[118px] w-full shrink-0 items-center justify-center rounded-b-[40px]"
        style={{
          background: '#000000',
          boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
        }}
      >
        <h1
          className="text-[28px] font-bold text-white"
          style={{ fontFamily: 'Pretendard, sans-serif', lineHeight: '48px' }}
        >
          {title}
        </h1>
        {!isDashboard && (
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            ← 대시보드
          </button>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-8">{children}</main>
    </div>
  );
}
