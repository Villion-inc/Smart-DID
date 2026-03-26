import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBooksByAge } from '../../api/did.api';
import type { DidBook } from '../../types';
import { DidV2Layout } from './DidV2Layout';

type TabKey = 'preschool' | 'elementary' | 'teen' | 'librarian';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'preschool', label: '유아' },
  { key: 'elementary', label: '초등' },
  { key: 'teen', label: '청소년' },
  { key: 'librarian', label: '사서추천' },
];

export function DidV2Recommend() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('preschool');
  const [books, setBooks] = useState<DidBook[]>([]);
  const [loading, setLoading] = useState(true);

  // 탭별 캐시
  const [cache, setCache] = useState<Record<string, DidBook[]>>({});

  useEffect(() => {
    // 캐시에 있으면 바로 사용
    if (cache[activeTab]) {
      setBooks(cache[activeTab]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getBooksByAge(activeTab as any);
        if (!cancelled) {
          setBooks(list);
          setCache((prev) => ({ ...prev, [activeTab]: list }));
        }
      } catch {
        if (!cancelled) setBooks([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  return (
    <DidV2Layout title="추천도서">
      <div className="flex flex-1 flex-col">
        {/* 탭 바 */}
        <div className="mb-3 flex shrink-0 gap-2 sm:mb-4">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="flex flex-1 items-center justify-center rounded-xl py-3 text-sm font-bold transition active:scale-[0.97] sm:py-4 sm:text-base"
                style={{
                  background: active
                    ? 'linear-gradient(180deg, #A8D8EA 0%, #8BC9E0 100%)'
                    : 'rgba(255,255,255,0.7)',
                  color: active ? '#1a3a4a' : '#888',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 도서 리스트 */}
        <div className="flex flex-1 flex-col gap-3 overflow-auto sm:gap-4">
          {loading && (
            <div className="flex flex-col gap-3 sm:gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex w-full animate-pulse items-center gap-3 rounded-2xl p-3 sm:gap-4 sm:p-4"
                  style={{ background: 'rgba(255,255,255,0.85)' }}
                >
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gray-200 sm:h-9 sm:w-9" />
                  <div className="h-20 w-14 shrink-0 rounded-lg bg-gray-200 sm:h-24 sm:w-16" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-4 w-3/4 rounded bg-gray-200 sm:h-5" />
                    <div className="h-3 w-1/2 rounded bg-gray-200 sm:h-4" />
                    <div className="h-3 w-1/3 rounded bg-gray-100 sm:h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && books.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-base text-gray-500 sm:text-lg">
                {activeTab === 'librarian'
                  ? '사서 추천 도서가 없습니다.'
                  : '인기 도서를 불러올 수 없습니다.'}
              </p>
            </div>
          )}
          {!loading &&
            books.map((book, idx) => (
              <button
                key={book.id || idx}
                type="button"
                onClick={() => navigate(`/did/video/${book.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98] sm:gap-4 sm:p-4"
                style={{ background: 'rgba(255,255,255,0.85)' }}
              >
                {/* 순위 */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white sm:h-9 sm:w-9 sm:text-base"
                  style={{ background: idx < 3 ? '#4DA3C4' : '#bbb' }}
                >
                  {idx + 1}
                </span>
                {/* 표지 */}
                <div className="relative h-20 w-14 shrink-0 sm:h-24 sm:w-16">
                  <div
                    className="h-full w-full rounded-lg"
                    style={{
                      background: book.coverImageUrl
                        ? `url(${book.coverImageUrl}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #a8d8ea 0%, #d4ead6 100%)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  />
                </div>
                {/* 정보 */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-bold text-gray-800 sm:text-lg">
                    {book.title}
                  </span>
                  <span className="mt-0.5 truncate text-sm text-gray-600 sm:text-base">
                    {book.author}
                  </span>
                  {book.category && (
                    <span className="mt-1 inline-block w-fit rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 sm:text-sm">
                      {book.category}
                    </span>
                  )}
                </div>
                <span className="text-xl text-gray-400 sm:text-2xl">&rsaquo;</span>
              </button>
            ))}
        </div>
      </div>
    </DidV2Layout>
  );
}
