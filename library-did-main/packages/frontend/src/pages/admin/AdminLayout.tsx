import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

const ASPECT_RATIO = 9 / 16;

/**
 * Admin 공통 레이아웃 - DID 스타일과 통일
 * - 세로 화면: 화면 꽉 채움
 * - 가로 화면: 9:16 비율 유지하며 중앙 배치
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

  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: isLandscape ? '#1a1a1a' : 'transparent' }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          fontFamily: 'Pretendard, sans-serif',
          background: 'linear-gradient(180deg, #F0F4F8 0%, #E8ECF0 100%)',
          width: isLandscape ? `calc(100vh * ${ASPECT_RATIO})` : '100%',
          height: '100%',
          maxWidth: '100%',
        }}
      >
        {/* Header */}
        <header
          className="relative flex w-full shrink-0 items-center justify-center px-4 py-4 sm:py-5"
          style={{ background: 'rgba(45, 55, 72, 0.95)' }}
        >
          {/* 뒤로가기 버튼 - 절대 위치 */}
          {!isDashboard && (
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              className="absolute left-4 text-base font-medium text-white/80 hover:text-white sm:text-lg"
            >
              ← 뒤로
            </button>
          )}
          {/* 제목 - 항상 중앙 */}
          <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
        </header>

        {/* Main content */}
        <main className="flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </main>

        {/* Bottom navigation */}
        <footer
          className="flex w-full shrink-0 items-center justify-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5"
          style={{
            background: 'rgba(255,255,255,0.9)',
            borderTop: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="flex h-12 flex-1 items-center justify-center rounded-xl text-base font-semibold transition active:scale-95 sm:h-14 sm:text-lg"
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
            className="flex h-12 flex-1 items-center justify-center rounded-xl text-base font-semibold transition active:scale-95 sm:h-14 sm:text-lg"
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
            className="flex h-12 flex-1 items-center justify-center rounded-xl text-base font-semibold transition active:scale-95 sm:h-14 sm:text-lg"
            style={{
              background: isRecommend ? '#2D3748' : '#F0F0F0',
              color: isRecommend ? '#fff' : '#666',
            }}
          >
            도서 등록
          </button>
        </footer>
      </div>
    </div>
  );
}
