import { useNavigate } from 'react-router-dom';

const LAYOUT_STYLE = {
  fontFamily: 'Pretendard, sans-serif',
  maxWidth: 480,
  minHeight: '100vh',
  backgroundColor: '#FFFFFF',
};

/**
 * DID V2 공통 레이아웃 (Frame 12~23 스펙)
 * - 900×1600, Pretendard
 * - 상단 헤더: ci 로고·타이틀·날짜
 * - 하단 바: 🔍검색, 📒신작, ◀︎ ▶︎
 */
export function DidV2Layout({
  children,
  title = '북메이트 추천도서',
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const navigate = useNavigate();
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div
      className="relative mx-auto flex w-full max-w-[480px] flex-col overflow-x-hidden bg-white"
      style={{ ...LAYOUT_STYLE }}
    >
      {/* Header - 컴팩트 */}
      <header
        className="relative flex h-14 w-full items-center border-b border-black/10 shrink-0"
        style={{
          background: '#EAEAEA',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
        }}
      >
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-extrabold text-black">
          ci
        </span>
        <h1 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-extrabold text-black">
          {title}
        </h1>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-normal text-black">
          {dateStr}
        </span>
      </header>

      {/* Main content - scrollbar-gutter: stable으로 페이지 이동 시 레이아웃 흔들림 방지 */}
      <main
        className="flex-1 overflow-auto overflow-x-hidden pb-24"
        style={{ scrollbarGutter: 'stable' }}
      >
        {children}
      </main>

      {/* Bottom bar - 컴팩트 */}
      <footer
        className="fixed bottom-0 left-1/2 flex h-16 w-full max-w-[480px] -translate-x-1/2 items-center justify-between px-3"
        style={{
          background: '#F3F3F3',
          border: '1px solid #000000',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
          borderRadius: 20,
          marginBottom: 6,
        }}
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/did/search')}
            className="flex h-10 w-20 items-center justify-center rounded-xl border border-black text-sm"
            style={{
              background: '#D9D9D9',
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            🔍검색
          </button>
          <button
            type="button"
            onClick={() => navigate('/did/new')}
            className="flex h-10 w-20 items-center justify-center rounded-xl border border-black text-sm"
            style={{
              background: '#D9D9D9',
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            📒신작
          </button>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-black text-sm text-[#777]"
            style={{
              background: '#F5F5F5',
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
              fontFamily: 'Pretendard, sans-serif',
              transform: 'rotate(180deg)',
            }}
          >
            ▶︎
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-black text-sm text-[#777]"
            style={{
              background: '#F5F5F5',
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            ▶︎
          </button>
        </div>
      </footer>
    </div>
  );
}
