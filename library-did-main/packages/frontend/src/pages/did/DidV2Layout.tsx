import { useNavigate, useLocation } from 'react-router-dom';

/**
 * 키오스크 세로 화면용 DID 레이아웃
 * - 세로 비율: 약 450px × 780px (세로가 더 긴 키오스크)
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

  return (
    <div
      className="relative mx-auto flex flex-col overflow-hidden"
      style={{
        width: 450,
        height: 780,
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
  );
}
