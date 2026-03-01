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
      <div className="flex flex-1 flex-col" style={{ padding: '20px 0' }}>
        {/* 검색 전 초기 상태: 검색창을 정중앙에 배치 */}
        {!searched && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <span style={{ fontSize: 120, marginBottom: 30 }}>📚</span>
            <p className="font-semibold text-gray-700" style={{ fontSize: 42 }}>어떤 책을 찾고 있나요?</p>
            <p className="text-gray-500" style={{ fontSize: 32, marginTop: 16, marginBottom: 60 }}>아래에서 검색해보세요!</p>
            
            {/* Search box - 초기 상태에서는 중앙 위치 */}
            <div
              className="w-full"
              style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: 32, padding: 40 }}
            >
              <p className="text-center font-bold text-gray-700" style={{ fontSize: 36, marginBottom: 24 }}>
                여기에 써보세요!
              </p>
              <div className="flex" style={{ gap: 20 }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="예: 토끼, 모험"
                  className="min-w-0 flex-1 border-4 border-blue-200 bg-white outline-none focus:border-blue-400"
                  style={{ fontSize: 36, padding: '24px 32px', borderRadius: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  inputMode="search"
                  enterKeyHint="search"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="shrink-0 font-bold text-white transition active:scale-95"
                  style={{
                    fontSize: 36,
                    padding: '24px 48px',
                    borderRadius: 20,
                    background: 'linear-gradient(180deg, #6BB8D6 0%, #4DA3C4 100%)',
                  }}
                >
                  찾기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results - 검색 후에만 표시 */}
        <div className={`flex flex-col overflow-auto ${searched || loading ? 'flex-1' : 'hidden'}`} style={{ gap: 20 }}>
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-gray-500" style={{ fontSize: 36 }}>🔍 찾는 중...</p>
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center">
              <span style={{ fontSize: 100, marginBottom: 20 }}>🤔</span>
              <p className="text-gray-500" style={{ fontSize: 36 }}>검색 결과가 없어요</p>
              <p className="text-gray-400" style={{ fontSize: 28, marginTop: 12 }}>다른 단어로 찾아볼까요?</p>
            </div>
          )}
          {!loading &&
            results.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => navigate(`/did/video/${book.id}`)}
                className="flex w-full items-center text-left transition active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 24, padding: 24, gap: 24 }}
              >
                {/* Cover Image */}
                <div
                  className="shrink-0"
                  style={{
                    width: 120,
                    height: 160,
                    borderRadius: 16,
                    background: book.coverImageUrl
                      ? `url(${book.coverImageUrl}) center/cover no-repeat`
                      : 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                >
                  {!book.coverImageUrl && (
                    <div className="flex h-full w-full items-center justify-center" style={{ fontSize: 48 }}>
                      📚
                    </div>
                  )}
                </div>
                {/* Book Info */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold text-gray-800" style={{ fontSize: 36 }}>
                    {book.title}
                  </span>
                  <span className="truncate text-gray-600" style={{ fontSize: 28, marginTop: 8 }}>
                    {book.author}
                  </span>
                  <div className="flex flex-wrap items-center" style={{ gap: 12, marginTop: 16 }}>
                    {book.category && (
                      <span className="bg-blue-50 text-blue-700" style={{ fontSize: 24, padding: '8px 16px', borderRadius: 20 }}>
                        {book.category}
                      </span>
                    )}
                    {book.hasVideo && (
                      <span className="bg-green-50 text-green-700" style={{ fontSize: 24, padding: '8px 16px', borderRadius: 20 }}>
                        🎬 영상있음
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-gray-400" style={{ fontSize: 48 }}>›</span>
              </button>
            ))}
        </div>

        {/* Search box - 검색 후에는 하단에 표시 */}
        {(searched || loading) && (
          <div
            className="w-full shrink-0"
            style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', borderRadius: 32, padding: 32, marginTop: 20 }}
          >
            <div className="flex" style={{ gap: 20 }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="예: 토끼, 모험"
                className="min-w-0 flex-1 border-4 border-blue-200 bg-white outline-none focus:border-blue-400"
                style={{ fontSize: 32, padding: '20px 28px', borderRadius: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                inputMode="search"
                enterKeyHint="search"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="shrink-0 font-bold text-white transition active:scale-95"
                style={{
                  fontSize: 32,
                  padding: '20px 40px',
                  borderRadius: 20,
                  background: 'linear-gradient(180deg, #6BB8D6 0%, #4DA3C4 100%)',
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
