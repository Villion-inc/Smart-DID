import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchBooksWithVideo } from '../../api/did.api';
import type { SearchResultWithVideo } from '../../api/did.api';
import { DidV2Layout } from './DidV2Layout';

/**
 * Frame 23 - 책 찾기: 검색 입력 + 결과 카드
 */
export function DidV2Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultWithVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const list = await searchBooksWithVideo(query.trim(), 20);
      setResults(list);
    } catch (e) {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <DidV2Layout title="책 찾기">
      <div className="px-4 py-3" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <p className="mb-3 text-base font-extrabold text-black">
          제목이나 단어를 써보세요!
        </p>

        <div
          className="mb-4 rounded-2xl border border-black p-4 shadow"
          style={{
            background: '#F2F2F2',
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            className="mb-3 rounded-xl border border-black bg-[#F2F2F2] px-3 py-2 shadow"
            style={{ boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="예: 토끼, 모험, 과학"
              className="w-full bg-transparent text-sm font-normal text-black outline-none"
              style={{ fontFamily: 'Pretendard, sans-serif' }}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="w-full rounded-xl bg-[#D9D9D9] py-2 text-sm font-bold shadow"
            style={{ boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' }}
          >
            검색
          </button>
        </div>

        {loading && (
          <p className="py-4 text-center text-sm text-black">검색 중...</p>
        )}
        {!loading && searched && results.length === 0 && (
          <p className="py-4 text-center text-sm text-black">검색 결과가 없습니다.</p>
        )}
        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-3">
            {results.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => navigate(`/did/video/${book.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
                style={{
                  background: '#F2F2F2',
                  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              >
                <span className="text-3xl">😺</span>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-bold leading-tight text-black">
                    {book.title}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded-full border border-black bg-white px-2 py-0.5 text-xs">
                      4-6세
                    </span>
                    <span className="rounded-full border border-black bg-white px-2 py-0.5 text-xs">
                      {book.category || '상상'}
                    </span>
                    <span className="rounded-full border border-black bg-white px-2 py-0.5 text-xs">
                      감정
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DidV2Layout>
  );
}
