import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { checkAlpasStatus } from '../../api/did.api';

const ASPECT_RATIO = 9 / 16;
const DESIGN_WIDTH = 640; // 기준 너비 (px) — 이 너비 이상이면 비례 확대
const IDLE_TIMEOUT_MS = 60_000; // 60초 무조작 시 홈 복귀
const WARNING_BEFORE_MS = 10_000; // 복귀 10초 전 경고 표시

/**
 * 키오스크 세로 화면용 DID 레이아웃
 * - 세로 화면(모바일/키오스크): 화면 꽉 채움
 * - 가로 화면(데스크탑): 9:16 비율 유지하며 중앙 배치
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
  const [alpasConnected, setAlpasConnected] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const [countdown, setCountdown] = useState(
    Math.floor(WARNING_BEFORE_MS / 1000),
  );

  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  // 화면 방향 감지 + 키오스크 동적 폰트 스케일링
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const landscape = vw > vh;
      setIsLandscape(landscape);

      // DID 컨테이너의 실제 너비 계산
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
    checkAlpasStatus().then(setAlpasConnected);
  }, []);

  // 유휴 타이머: 홈이 아닌 페이지에서 일정 시간 무조작 시 홈으로 자동 복귀
  useEffect(() => {
    if (isHome) return;

    const resetIdle = () => {
      setIdleWarning(false);
      setCountdown(Math.floor(WARNING_BEFORE_MS / 1000));
      clearTimeout(idleTimerRef.current);
      clearTimeout(warningTimerRef.current);
      clearInterval(countdownRef.current);

      // 경고 타이머
      warningTimerRef.current = setTimeout(() => {
        setIdleWarning(true);
        let sec = Math.floor(WARNING_BEFORE_MS / 1000);
        setCountdown(sec);
        countdownRef.current = setInterval(() => {
          sec -= 1;
          setCountdown(sec);
        }, 1000);
      }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

      // 홈 복귀 타이머
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
          className="flex w-full shrink-0 items-center justify-between px-4 py-3 sm:px-6 sm:py-4"
          style={{ background: 'rgba(255,255,255,0.4)' }}
        >
          {/* Left: Title */}
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
          {/* Right: Logo */}
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

      {/* Bottom navigation bar */}
      {!hideFooter && (
        <footer
          className="flex w-full shrink-0 items-center justify-between px-4 py-4 sm:px-6 sm:py-5"
          style={{
            background: 'rgba(255,255,255,0.85)',
            borderTop: '1px solid rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate('/did')}
              className="flex h-12 items-center justify-center rounded-2xl px-4 text-base font-semibold transition active:scale-95 sm:h-14 sm:px-6 sm:text-lg"
              style={{
                background: isHome
                  ? 'linear-gradient(180deg, #A8D8EA 0%, #8BC9E0 100%)'
                  : '#F0F0F0',
                color: isHome ? '#2D5A6B' : '#666',
              }}
            >
              홈
            </button>
            {alpasConnected && (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/did/search')}
                  className="flex h-12 items-center justify-center rounded-2xl px-4 text-base font-semibold transition active:scale-95 sm:h-14 sm:px-6 sm:text-lg"
                  style={{
                    background: location.pathname.includes('/search')
                      ? 'linear-gradient(180deg, #A8D8EA 0%, #8BC9E0 100%)'
                      : '#F0F0F0',
                    color: location.pathname.includes('/search') ? '#2D5A6B' : '#666',
                  }}
                >
                  검색
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/did/new')}
                  className="flex h-12 items-center justify-center rounded-2xl px-4 text-base font-semibold transition active:scale-95 sm:h-14 sm:px-6 sm:text-lg"
                  style={{
                    background: location.pathname.includes('/did/new')
                      ? 'linear-gradient(180deg, #A8D8EA 0%, #8BC9E0 100%)'
                      : '#F0F0F0',
                    color: location.pathname.includes('/did/new') ? '#2D5A6B' : '#666',
                  }}
                >
                  신작 도서
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-gray-500 transition active:scale-95 sm:h-14 sm:w-14 sm:text-2xl"
              style={{ background: '#F0F0F0' }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-gray-500 transition active:scale-95 sm:h-14 sm:w-14 sm:text-2xl"
              style={{ background: '#F0F0F0' }}
            >
              ›
            </button>
          </div>
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
