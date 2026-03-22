import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useEffect, useState } from 'react';

const NAV_TABS = [
  { label: '대시보드', path: '/admin/dashboard' },
  { label: '영상 관리', path: '/admin/videos' },
  { label: '도서 등록', path: '/admin/recommend' },
] as const;

const ASPECT_RATIO = 9 / 16;

/**
 * Admin 공통 레이아웃 - 키오스크 9:16 비율 + 상단 네비게이션
 */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();

  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

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
          className="flex w-full shrink-0 items-center justify-between px-4 py-0"
          style={{ background: 'rgba(45, 55, 72, 0.95)' }}
        >
          {/* 좌측: 타이틀 */}
          <span
            className="shrink-0 cursor-pointer text-base font-bold text-white sm:text-lg"
            onClick={() => navigate('/admin/dashboard')}
          >
            BookMate 관리자
          </span>

          {/* 중앙: 탭 네비게이션 */}
          <nav className="flex">
            {NAV_TABS.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  type="button"
                  onClick={() => navigate(tab.path)}
                  className="relative px-3 py-3 text-xs font-medium transition sm:px-4 sm:py-4 sm:text-sm"
                  style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.6)' }}
                >
                  {tab.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t"
                      style={{ background: '#63B3ED' }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* 우측: DID 보기 + 로그아웃 */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/did')}
              className="rounded-md px-2 py-1 text-[10px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white sm:px-3 sm:py-1.5 sm:text-xs"
            >
              DID
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-white/80 transition hover:bg-white/20 hover:text-white sm:px-3 sm:py-1.5 sm:text-xs"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
