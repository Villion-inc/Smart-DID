import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

// 기본 디자인 사이즈 (세로 키오스크 비율)
const BASE_WIDTH = 450;
const BASE_HEIGHT = 780;
const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

/**
 * 키오스크 세로 화면용 DID 레이아웃
 * - 세로 비율: 약 450px × 780px (세로가 더 긴 키오스크)
 * - 화면 크기에 맞춰 자동 스케일링 (비율 유지)
 * - 로고 제거, 심플한 헤더
 * - 하단 네비게이션 바
 */
export function DidV2Layout({
  children,
  title,
  hideHeader = false,
  hideFooter = false,
}: {
  children: React.ReactNode;
  title?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/did' || location.pathname === '/did/';

  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const windowRatio = windowWidth / windowHeight;

      let newScale: number;
      if (windowRatio > ASPECT_RATIO) {
        // 화면이 더 넓음 → 높이 기준으로 스케일
        newScale = windowHeight / BASE_HEIGHT;
      } else {
        // 화면이 더 좁음 → 너비 기준으로 스케일
        newScale = windowWidth / BASE_WIDTH;
      }
      setScale(newScale);
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: '#1a1a1a' }}
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          fontFamily: 'Pretendard, sans-serif',
          background: 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)',
        }}
      >
      {/* Header */}
      {!hideHeader && (
        <header
          className="flex h-14 w-full shrink-0 items-center justify-center px-4"
          style={{ background: 'rgba(255,255,255,0.4)' }}
        >
          {title ? (
            <h1 className="max-w-full truncate text-xl font-bold text-gray-800">
              {title}
            </h1>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-800">BookMate</span>
              <span className="text-base text-gray-600">북메이트</span>
            </div>
          )}
        </header>
      )}

      {/* Main content */}
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">
        {children}
      </main>

      {/* Bottom navigation bar */}
      {!hideFooter && (
        <footer
          className="flex h-16 w-full shrink-0 items-center justify-between px-4"
          style={{
            background: 'rgba(255,255,255,0.85)',
            borderTop: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/did')}
              className="flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition active:scale-95"
              style={{
                background: isHome
                  ? 'linear-gradient(180deg, #A8D8EA 0%, #8BC9E0 100%)'
                  : '#F0F0F0',
                color: isHome ? '#2D5A6B' : '#666',
              }}
            >
              홈
            </button>
            <button
              type="button"
              onClick={() => navigate('/did/search')}
              className="flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition active:scale-95"
              style={{
                background:
                  location.pathname === '/did/search'
                    ? 'linear-gradient(180deg, #A8D8EA 0%, #8BC9E0 100%)'
                    : '#F0F0F0',
                color: location.pathname === '/did/search' ? '#2D5A6B' : '#666',
              }}
            >
              검색
            </button>
            <button
              type="button"
              onClick={() => navigate('/did/new')}
              className="flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition active:scale-95"
              style={{
                background:
                  location.pathname === '/did/new'
                    ? 'linear-gradient(180deg, #FFE5A0 0%, #FFD966 100%)'
                    : '#F0F0F0',
                color: location.pathname === '/did/new' ? '#6B5A2D' : '#666',
              }}
            >
              신작
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-gray-500 transition active:scale-95"
              style={{ background: '#F0F0F0' }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-gray-500 transition active:scale-95"
              style={{ background: '#F0F0F0' }}
            >
              ›
            </button>
          </div>
        </footer>
      )}
      </div>
    </div>
  );
}
