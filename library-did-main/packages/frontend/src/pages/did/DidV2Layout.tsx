import { useNavigate } from 'react-router-dom';

const LAYOUT_STYLE = {
  fontFamily: 'Pretendard, sans-serif',
  maxWidth: 480,
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #B8E6F5 0%, #E8F5C8 100%)',
};

/**
 * DID V2 공통 레이아웃 - 귀여운 아동 친화 디자인
 * - 밝은 그라데이션 배경, 둥근 UI
 * - 헤더: 왼쪽 BookMate/북메이트만 (로고·페이지 제목 미표시)
 * - 하단 바: 🏠메인, 🔍검색, 📒신작, ◀︎ ▶︎
 */
export function DidV2Layout({
  children,
  title = '북메이트 추천도서',
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="relative mx-auto flex w-full max-w-[480px] flex-col overflow-x-hidden"
      style={{ ...LAYOUT_STYLE }}
    >
      {/* Header - BookMate/북메이트만 표시, 제목은 표시하지 않음 */}
      <header className="flex h-16 w-full shrink-0 items-center px-4 pt-2">
        <div className="flex flex-col shrink-0">
          <span className="text-base font-extrabold leading-tight text-gray-800">
            BookMate
          </span>
          <span className="text-xs font-semibold text-gray-600">북메이트</span>
        </div>
      </header>

      {/* Main content */}
      <main
        className="flex min-h-0 flex-1 flex-col items-center overflow-auto overflow-x-hidden pb-24"
        style={{ scrollbarGutter: 'stable' }}
      >
        {children}
      </main>

      {/* Bottom bar - 둥글고 부드러운 스타일 */}
      <footer
        className="fixed bottom-0 left-1/2 flex h-20 w-full max-w-[480px] -translate-x-1/2 items-center justify-between px-4"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.06)',
          borderRadius: 24,
          marginBottom: 8,
          border: '1px solid rgba(255,255,255,0.9)',
        }}
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/did')}
            className="flex h-12 min-w-[72px] items-center justify-center rounded-2xl text-base font-semibold text-gray-700 transition active:scale-[0.98]"
            style={{
              background: 'linear-gradient(180deg, #E8F5C8 0%, #D4E9A8 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            🏠 메인
          </button>
          <button
            type="button"
            onClick={() => navigate('/did/search')}
            className="flex h-12 min-w-[72px] items-center justify-center rounded-2xl text-base font-semibold text-gray-700 transition active:scale-[0.98]"
            style={{
              background: 'linear-gradient(180deg, #A8D8EA 0%, #8BC9E0 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            🔍 검색
          </button>
          <button
            type="button"
            onClick={() => navigate('/did/new')}
            className="flex h-12 min-w-[72px] items-center justify-center rounded-2xl text-base font-semibold text-gray-700 transition active:scale-[0.98]"
            style={{
              background: 'linear-gradient(180deg, #FFE5A0 0%, #FFD966 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            📒 신작
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-gray-600 transition active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transform: 'rotate(180deg)',
            }}
          >
            ▶︎
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-gray-600 transition active:scale-[0.98]"
            style={{
              background: 'rgba(255,255,255,0.9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            ▶︎
          </button>
        </div>
      </footer>
    </div>
  );
}
