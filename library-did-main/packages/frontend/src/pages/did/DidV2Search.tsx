import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchBooksWithVideo } from '../../api/did.api';
import type { SearchResultWithVideo } from '../../api/did.api';
import { DidV2Layout } from './DidV2Layout';

/**
 * 책 검색 페이지 (키오스크 세로 화면)
 * - URL 파라미터로 검색어 유지 (뒤로가기 시 상태 복원)
 */
export function DidV2Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResultWithVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // URL에 검색어가 있으면 자동 검색 (뒤로가기 시 복원)
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery.trim()) {
      setQuery(urlQuery);
      performSearch(urlQuery);
    }
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const list = await searchBooksWithVideo(searchQuery.trim(), 20);
      setResults(list);
    } catch (e) {
      setResults([]);
    }
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    // URL에 검색어 저장 (뒤로가기 시 복원용)
    setSearchParams({ q: query.trim() });
    await performSearch(query.trim());
  };

  return (
    <DidV2Layout title="책 검색">
      <div className="flex flex-1 flex-col py-2">
        {/* 검색 전 초기 상태: 검색창을 정중앙에 배치 */}
        {!searched && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <span className="mb-3 text-5xl sm:mb-4 sm:text-6xl">📚</span>
            <p className="text-lg font-semibold text-gray-700 sm:text-xl md:text-2xl">어떤 책을 찾고 있나요?</p>
            <p className="mb-6 mt-1 text-sm text-gray-500 sm:mb-8 sm:text-base">아래에서 검색해보세요!</p>
            
            {/* Search box - 초기 상태에서는 중앙 위치 */}
            <div
              className="w-full rounded-2xl p-4 sm:rounded-3xl sm:p-6"
              style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
            >
              <div className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="예: 토끼, 모험"
                  className="min-w-0 flex-1 rounded-xl border-2 border-blue-200 bg-white px-4 py-3 text-base outline-none focus:border-blue-400 sm:px-5 sm:py-4 sm:text-lg"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  inputMode="search"
                  enterKeyHint="search"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="shrink-0 rounded-xl px-5 py-3 text-base font-bold text-white transition active:scale-95 sm:px-8 sm:py-4 sm:text-lg"
                  style={{ background: 'linear-gradient(180deg, #6BB8D6 0%, #4DA3C4 100%)' }}
                >
                  찾기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results - 검색 후에만 표시 */}
        <div className={`flex flex-col gap-3 overflow-auto sm:gap-4 ${searched || loading ? 'flex-1' : 'hidden'}`}>
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-base text-gray-500 sm:text-lg">🔍 찾는 중...</p>
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="mb-2 text-4xl sm:text-5xl">🤔</span>
              <p className="text-base text-gray-500 sm:text-lg">검색 결과가 없어요</p>
              <p className="mt-1 text-sm text-gray-400">다른 단어로 찾아볼까요?</p>
            </div>
          )}
          {!loading &&
            results.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => navigate(`/did/video/${book.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98] sm:gap-4 sm:p-4"
                style={{ background: 'rgba(255,255,255,0.85)' }}
              >
                {/* Cover Image */}
                <div
                  className="h-20 w-14 shrink-0 rounded-lg sm:h-24 sm:w-16"
                  style={{
                    background: book.coverImageUrl
                      ? `url(${book.coverImageUrl}) center/cover no-repeat`
                      : 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  {!book.coverImageUrl && (
                    <div className="flex h-full w-full items-center justify-center text-2xl">📚</div>
                  )}
                </div>
                {/* Book Info */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-bold text-gray-800 sm:text-lg">
                    {book.title}
                  </span>
                  <span className="mt-0.5 truncate text-sm text-gray-600 sm:text-base">
                    {book.author}
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2">
                    {book.category && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 sm:text-sm">
                        {book.category}
                      </span>
                    )}
                    {book.hasVideo && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700 sm:text-sm">
                        🎬 영상있음
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xl text-gray-400 sm:text-2xl">›</span>
              </button>
            ))}
        </div>

        {/* Search box - 검색 후에는 하단에 표시 */}
        {(searched || loading) && (
          <div
            className="mt-3 w-full shrink-0 rounded-2xl p-3 sm:mt-4 sm:p-4"
            style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' }}
          >
            <div className="flex gap-2 sm:gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="예: 토끼, 모험"
                className="min-w-0 flex-1 rounded-xl border-2 border-blue-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 sm:px-4 sm:py-3 sm:text-base"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                inputMode="search"
                enterKeyHint="search"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition active:scale-95 sm:px-6 sm:py-3 sm:text-base"
                style={{ background: 'linear-gradient(180deg, #6BB8D6 0%, #4DA3C4 100%)' }}
              >
                찾기
              </button>
            </div>
          </div>
        )}
      </div>
    </DidV2Layout>
  );
}
