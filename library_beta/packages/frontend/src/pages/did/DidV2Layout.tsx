import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

const ASPECT_RATIO = 9 / 16;

/** 디자인 기준 너비 (px). 이 너비에서 1rem = 16px. */
const DESIGN_REF_WIDTH = 500;

/**
 * 키오스크 세로 화면용 DID 레이아웃
 * - 세로 화면(모바일/키오스크): 화면 꽉 채움
 * - 가로 화면(데스크탑): 9:16 비율 유지하며 중앙 배치
 * - 1080×1920 세로 모니터: rem 기반 자동 스케일 (약 2배)
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

  const [isLandscape, setIsLandscape] = useState(false);

  // 키오스크 스케일: 뷰포트 기반 root font-size 조정
  useEffect(() => {
    const saved = document.documentElement.style.fontSize;

    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isLand = vw > vh;
      setIsLandscape(isLand);

      // 실제 DID 컨테이너 너비 기준으로 스케일 계산
      const containerWidth = isLand ? vh * ASPECT_RATIO : vw;
      const scale = containerWidth / DESIGN_REF_WIDTH;

      // 600px 이상일 때만 스케일 업 (소형 모바일에서는 원본 유지)
      if (containerWidth > 600) {
        document.documentElement.style.fontSize = `${16 * scale}px`;
      } else {
        document.documentElement.style.fontSize = '';
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      document.documentElement.style.fontSize = saved;
    };
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
          background: 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)',
          width: isLandscape ? `calc(100vh * ${ASPECT_RATIO})` : '100%',
          height: '100%',
          maxWidth: '100%',
        }}
      >
      {/* Header */}
      {!hideHeader && (
        <header
          className="flex w-full shrink-0 items-center justify-between px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.4)' }}
        >
          {/* Left: Title */}
          <div className="min-w-0 flex-1">
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
          </div>
          {/* Right: Logo */}
          <img
            src="/logos/kkumsaem-logo.png"
            alt="꿈샘 어린이청소년도서관"
            className="h-6 max-w-[7.5rem] shrink-0 object-contain"
          />
        </header>
      )}

      {/* Main content */}
      <main className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-2">
        {children}
      </main>

      {/* Bottom navigation bar */}
      {!hideFooter && (
        <footer
          className="flex w-full shrink-0 items-center justify-between px-4 py-4"
          style={{
            background: 'rgba(255,255,255,0.85)',
            borderTop: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/did')}
              className="flex h-12 items-center justify-center rounded-2xl px-4 text-base font-semibold transition active:scale-95"
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
              className="flex h-12 items-center justify-center rounded-2xl px-4 text-base font-semibold transition active:scale-95"
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
              className="flex h-12 items-center justify-center rounded-2xl px-4 text-base font-semibold transition active:scale-95"
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
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-gray-500 transition active:scale-95"
              style={{ background: '#F0F0F0' }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-gray-500 transition active:scale-95"
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
