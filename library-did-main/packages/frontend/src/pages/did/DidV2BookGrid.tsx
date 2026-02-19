import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBooksByAge } from '../../api/did.api';
import type { DidBook, AgeGroup } from '../../types';
import { DidV2Layout } from './DidV2Layout';

/**
 * Frame 13 - 연령별 도서 3×3 그리드
 */
export function DidV2BookGrid() {
  const navigate = useNavigate();
  const { group } = useParams<{ group: string }>();
  const ageGroup = (group || 'elementary') as AgeGroup;
  const [books, setBooks] = useState<DidBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      setLoading(true);
      try {
        const list = await getBooksByAge(ageGroup);
        if (!cancelled) {
          setBooks(list.slice(0, 9));
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setBooks([]);
          setError('도서를 불러오지 못했습니다.');
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ageGroup]);

  return (
    <DidV2Layout title="북메이트 추천도서">
      <div
        className="flex w-full max-w-[480px] flex-1 flex-col items-center px-4 py-4"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        <button
          type="button"
          onClick={() => navigate('/did')}
          className="mb-4 self-start text-lg font-normal text-black"
        >
          ◀︎ 이전
        </button>

        <div className="grid w-full grid-cols-3 gap-x-3 gap-y-6">
          {(loading ? [] : books).map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => navigate(`/did/video/${book.id}`)}
              className="flex flex-col items-center"
            >
              <div
                className="h-36 w-full max-w-[140px] overflow-hidden rounded-xl bg-[#D9D9D9] shadow"
                style={{ boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' }}
              >
                {book.coverImageUrl ? (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">
                    📖
                  </div>
                )}
              </div>
              <span className="mt-2 max-w-[140px] truncate text-center text-sm font-normal text-black">
                {book.title || '제목'}
              </span>
            </button>
          ))}
        </div>
        {error && (
          <p className="w-full py-4 text-center text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && books.length === 0 && (
          <p className="flex flex-1 items-center py-8 text-center text-base text-black">도서가 없습니다.</p>
        )}
      </div>
    </DidV2Layout>
  );
}
