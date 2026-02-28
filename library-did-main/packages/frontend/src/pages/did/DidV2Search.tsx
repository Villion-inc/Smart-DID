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
      <div className="flex flex-1 flex-col px-4 py-2">
        {/* 검색 전 초기 상태: 검색창을 정중앙에 배치 */}
        {!searched && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <span className="text-5xl mb-3">📚</span>
            <p className="text-lg font-semibold text-gray-700">어떤 책을 찾고 있나요?</p>
            <p className="mt-1 text-sm text-gray-500 mb-6">아래에서 검색해보세요!</p>
            
            {/* Search box - 초기 상태에서는 중앙 위치 */}
            <div
              className="w-full rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
            >
              <p className="mb-3 text-center text-lg font-bold text-gray-700">
                🔍 여기에 써보세요!
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="예: 토끼, 모험, 과학"
                  className="flex-1 rounded-xl border-2 border-blue-200 bg-white px-4 py-4 text-lg outline-none focus:border-blue-400"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  inputMode="search"
                  enterKeyHint="search"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="rounded-xl px-6 py-4 text-lg font-bold text-white transition active:scale-95"
                  style={{
                    background: 'linear-gradient(180deg, #6BB8D6 0%, #4DA3C4 100%)',
                    minWidth: '80px',
                  }}
                >
                  찾기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results - 검색 후에만 표시 */}
        <div className={`flex flex-col gap-2 overflow-auto ${searched || loading ? 'flex-1' : 'hidden'}`}>
          {/* 검색 전 메시지는 위로 이동됨 */}
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-base text-gray-500">🔍 찾는 중...</p>
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="text-4xl mb-2">🤔</span>
              <p className="text-base text-gray-500">검색 결과가 없어요</p>
              <p className="mt-1 text-sm text-gray-400">다른 단어로 찾아볼까요?</p>
            </div>
          )}
          {!loading &&
            results.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => navigate(`/did/video/${book.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.85)' }}
              >
                {/* Cover Image */}
                <div
                  className="h-16 w-12 shrink-0 rounded-lg"
                  style={{
                    background: book.coverImageUrl
                      ? `url(${book.coverImageUrl}) center/cover no-repeat`
                      : 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  }}
                >
                  {!book.coverImageUrl && (
                    <div className="flex h-full w-full items-center justify-center text-xl">
                      📚
                    </div>
                  )}
                </div>
                {/* Book Info */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-bold text-gray-800">
                    {book.title}
                  </span>
                  <span className="mt-0.5 truncate text-sm text-gray-600">
                    {book.author}
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {book.category && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {book.category}
                      </span>
                    )}
                    {book.hasVideo && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                        🎬 영상있음
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xl text-gray-400">›</span>
              </button>
            ))}
        </div>

        {/* Search box - 검색 후에는 하단에 표시 */}
        {(searched || loading) && (
          <div
            className="mt-3 w-full shrink-0 rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' }}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="예: 토끼, 모험, 과학"
                className="flex-1 rounded-xl border-2 border-blue-200 bg-white px-4 py-3 text-base outline-none focus:border-blue-400"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                inputMode="search"
                enterKeyHint="search"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-xl px-5 py-3 text-base font-bold text-white transition active:scale-95"
                style={{
                  background: 'linear-gradient(180deg, #6BB8D6 0%, #4DA3C4 100%)',
                  minWidth: '70px',
                }}
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
