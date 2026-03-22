import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';

const ASPECT_RATIO = 9 / 16;
const DESIGN_WIDTH = 640;
const IDLE_TIMEOUT_MS = 60_000;
const WARNING_BEFORE_MS = 10_000;

const TABS = [
  { label: '홈', path: '/did', match: (p: string) => p === '/did' || p === '/did/' },
  { label: '추천', path: '/did/recommend', match: (p: string) => p.includes('/did/recommend') || p.includes('/did/age') },
  { label: '신착', path: '/did/new', match: (p: string) => p.includes('/did/new') },
  { label: '검색', path: '/did/search', match: (p: string) => p.includes('/search') },
] as const;

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
  const [idleWarning, setIdleWarning] = useState(false);
  const [countdown, setCountdown] = useState(
    Math.floor(WARNING_BEFORE_MS / 1000),
  );

  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const landscape = vw > vh;
      setIsLandscape(landscape);

      const effectiveWidth = landscape ? vh * ASPECT_RATIO : vw;
      const scale = effectiveWidth / DESIGN_WIDTH;
      if (scale > 1) {
        document.documentElement.style.fontSize = `${16 * scale}px`;
      } else {
        document.documentElement.style.fontSize = '';
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      document.documentElement.style.fontSize = '';
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (isHome) return;

    const resetIdle = () => {
      setIdleWarning(false);
      setCountdown(Math.floor(WARNING_BEFORE_MS / 1000));
      clearTimeout(idleTimerRef.current);
      clearTimeout(warningTimerRef.current);
      clearInterval(countdownRef.current);

      warningTimerRef.current = setTimeout(() => {
        setIdleWarning(true);
        let sec = Math.floor(WARNING_BEFORE_MS / 1000);
        setCountdown(sec);
        countdownRef.current = setInterval(() => {
          sec -= 1;
          setCountdown(sec);
        }, 1000);
      }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

      idleTimerRef.current = setTimeout(() => {
        navigate('/did');
      }, IDLE_TIMEOUT_MS);
    };

    const events = ['pointerdown', 'scroll'];
    events.forEach((e) =>
      window.addEventListener(e, resetIdle, { passive: true }),
    );
    resetIdle();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      clearTimeout(idleTimerRef.current);
      clearTimeout(warningTimerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [isHome, navigate]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: isLandscape ? '#1a1a1a' : 'transparent' }}
    >
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          fontFamily: '"Noto Sans KR", "Pretendard", sans-serif',
          background: 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)',
          width: isLandscape ? `calc(100vh * ${ASPECT_RATIO})` : '100%',
          height: '100%',
          maxWidth: '100%',
        }}
      >
      {/* Header */}
      {!hideHeader && (
        <header
          className="flex w-full shrink-0 items-center justify-between px-4 py-3 sm:px-6 sm:py-4"
          style={{ background: 'rgba(255,255,255,0.4)' }}
        >
          <div className="min-w-0 flex-1">
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
          </div>
          <img
            src="/logos/kkumsaem-logo.png"
            alt="꿈샘 어린이청소년도서관"
            className="h-6 max-w-[7.5rem] shrink-0 object-contain sm:h-7 sm:max-w-[8.75rem]"
          />
        </header>
      )}

      {/* Main content */}
      <main className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-2 sm:px-6 sm:py-4">
        {children}
      </main>

      {/* Bottom navigation — 4탭, 높이 키움, 명확한 버튼 스타일 */}
      {!hideFooter && (
        <footer
          className="flex w-full shrink-0 items-center gap-1.5 px-3 py-3 sm:gap-2 sm:px-4 sm:py-4"
          style={{
            background: 'rgba(255,255,255,0.95)',
            borderTop: '2px solid rgba(0,0,0,0.08)',
          }}
        >
          {TABS.map((tab) => {
            const active = tab.match(location.pathname);
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 text-xs font-bold transition active:scale-95 sm:py-3 sm:text-sm"
                style={{
                  background: active
                    ? 'linear-gradient(180deg, #A8D8EA 0%, #8BC9E0 100%)'
                    : '#F0F0F0',
                  color: active ? '#1a3a4a' : '#888',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  border: active ? '2px solid rgba(45,90,107,0.3)' : '2px solid transparent',
                }}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </footer>
      )}

      {/* 유휴 경고 오버레이 */}
      {idleWarning && (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-50 flex justify-center px-4">
          <div className="rounded-2xl bg-black/80 px-6 py-4 text-center text-white shadow-lg backdrop-blur-sm">
            <p className="text-lg font-semibold">
              {countdown}초 후 홈으로 돌아갑니다
            </p>
            <p className="mt-1 text-sm text-gray-300">
              화면을 터치하면 계속 볼 수 있어요
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
