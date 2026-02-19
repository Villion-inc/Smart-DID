import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchBooksWithVideo } from '../../api/did.api';
import type { SearchResultWithVideo } from '../../api/did.api';
import { useSearchCacheStore } from '../../stores/searchCacheStore';
import { DidV2Layout } from './DidV2Layout';

/** 마운트 시 스토어에서 캐시 초기값 읽기 (뒤로가기 시 검색 결과 복원) */
function getInitialSearchState() {
  const { query, results } = useSearchCacheStore.getState();
  return {
    query,
    results,
    searched: results.length > 0 || query.length > 0,
  };
}

/**
 * Frame 23 - 책 찾기: 검색 입력 + 결과 카드 (검색/조회 완전 구현)
 * 뒤로가기 시 캐시된 검색어·결과 복원
 */
export function DidV2Search() {
  const navigate = useNavigate();
  const setCache = useSearchCacheStore((s) => s.setCache);
  const [query, setQuery] = useState(() => getInitialSearchState().query);
  const [results, setResults] = useState<SearchResultWithVideo[]>(() => getInitialSearchState().results);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(() => getInitialSearchState().searched);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('검색어를 입력해주세요.');
      return;
    }
    setError(null);
    setLoading(true);
    setSearched(true);
    try {
      const list = await searchBooksWithVideo(query.trim(), 20);
      setResults(list);
      setCache(query.trim(), list);
    } catch (e) {
      setResults([]);
      setError('검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DidV2Layout title="북메이트 추천도서">
      <div
        className="flex w-full max-w-[480px] flex-1 flex-col items-center justify-center px-4 py-6"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        <p className="mb-4 w-full text-center text-lg font-extrabold text-black">
          제목이나 단어를 써보세요!
        </p>

        <div
          className="mb-5 w-full max-w-[420px] rounded-2xl border border-black p-5 shadow"
          style={{
            background: '#F2F2F2',
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            className="mb-4 rounded-xl border border-black bg-[#F2F2F2] px-4 py-3 shadow"
            style={{ boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="예: 토끼, 모험, 과학"
              className="w-full bg-transparent text-base font-normal text-black outline-none"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="w-full rounded-xl bg-[#D9D9D9] py-3 text-base font-bold shadow"
            style={{ boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' }}
          >
            검색
          </button>
        </div>

        {error && (
          <p className="mb-2 w-full text-center text-sm text-red-600">{error}</p>
        )}
        {loading && (
          <p className="py-6 text-center text-base text-black">검색 중...</p>
        )}
        {!loading && searched && results.length === 0 && !error && (
          <p className="py-6 text-center text-base text-black">검색 결과가 없습니다.</p>
        )}
        {!loading && results.length > 0 && (
          <>
            <p className="mb-2 w-full text-center text-sm text-gray-600">
              검색 결과 {results.length}건
            </p>
            <div className="flex w-full flex-col items-center gap-4">
              {results.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => navigate(`/did/video/${book.id}`)}
                  className="flex w-full max-w-[420px] items-center gap-4 rounded-2xl px-5 py-4 text-left"
                  style={{
                    background: '#F2F2F2',
                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {book.coverImageUrl ? (
                    <img
                      src={book.coverImageUrl}
                      alt=""
                      className="h-16 w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="text-4xl">😺</span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-bold leading-tight text-black">
                      {book.title}
                    </span>
                    {book.author && (
                      <span className="mt-1 truncate text-sm text-gray-600">
                        {book.author}
                      </span>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-black bg-white px-3 py-1 text-sm">
                        {book.category || '상상'}
                      </span>
                      {book.hasVideo && (
                        <span className="rounded-full border border-green-600 bg-green-50 px-3 py-1 text-sm text-green-700">
                          영상 있음
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </DidV2Layout>
  );
}
