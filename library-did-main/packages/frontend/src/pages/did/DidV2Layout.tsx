import { useNavigate, useLocation } from 'react-router-dom';

/**
 * 키오스크 세로 화면용 DID 레이아웃
 * - 화면 크기에 맞춰 100% 채움 (반응형)
 * - 키오스크(1080x1920) 및 모바일/데스크탑 모두 지원
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
      className="fixed inset-0 flex flex-col"
      style={{
        fontFamily: 'Pretendard, sans-serif',
        background: 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)',
      }}
    >
      {/* Header */}
      {!hideHeader && (
        <header
          className="flex w-full shrink-0 items-center justify-center px-4 py-3 sm:px-6 sm:py-4"
          style={{ background: 'rgba(255,255,255,0.4)' }}
        >
          {title ? (
            <h1 className="max-w-full truncate text-xl font-bold text-gray-800 sm:text-2xl md:text-3xl">
              {title}
            </h1>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xl font-bold text-gray-800 sm:text-2xl md:text-3xl">BookMate</span>
              <span className="text-base text-gray-600 sm:text-lg md:text-xl">북메이트</span>
            </div>
          )}
        </header>
      )}

      {/* Main content */}
      <main className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-2 sm:px-6 sm:py-4">
        {children}
      </main>

      {/* Bottom navigation bar */}
      {!hideFooter && (
        <footer
          className="flex w-full shrink-0 items-center justify-between px-4 py-4 sm:px-6 sm:py-5"
          style={{
            background: 'rgba(255,255,255,0.85)',
            borderTop: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('/did')}
              className="flex h-14 items-center justify-center rounded-2xl px-6 text-lg font-semibold transition active:scale-95 sm:h-16 sm:px-8 sm:text-xl"
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
              className="flex h-14 items-center justify-center rounded-2xl px-6 text-lg font-semibold transition active:scale-95 sm:h-16 sm:px-8 sm:text-xl"
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
              className="flex h-14 items-center justify-center rounded-2xl px-6 text-lg font-semibold transition active:scale-95 sm:h-16 sm:px-8 sm:text-xl"
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-gray-500 transition active:scale-95 sm:h-16 sm:w-16 sm:text-3xl"
              style={{ background: '#F0F0F0' }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-gray-500 transition active:scale-95 sm:h-16 sm:w-16 sm:text-3xl"
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
