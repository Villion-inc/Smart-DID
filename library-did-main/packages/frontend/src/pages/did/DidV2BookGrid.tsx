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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getBooksByAge(ageGroup);
        if (!cancelled) setBooks(list.slice(0, 9));
      } catch (e) {
        if (!cancelled) setBooks([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ageGroup]);

  return (
    <DidV2Layout title="북메이트 추천도서">
      <div className="px-4 py-3" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <button
          type="button"
          onClick={() => navigate('/did')}
          className="mb-3 text-base font-normal text-black"
        >
          ◀︎ 이전
        </button>

        <div className="grid grid-cols-3 gap-x-2 gap-y-4">
          {(loading ? [] : books).map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => navigate(`/did/video/${book.id}`)}
              className="flex flex-col items-center"
            >
              <div
                className="h-28 w-full max-w-[120px] overflow-hidden rounded-xl bg-[#D9D9D9] shadow"
                style={{ boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' }}
              >
                {book.coverImageUrl ? (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">
                    📖
                  </div>
                )}
              </div>
              <span className="mt-1 max-w-[120px] truncate text-xs font-normal text-black">
                {book.title || '제목'}
              </span>
            </button>
          ))}
        </div>
        {!loading && books.length === 0 && (
          <p className="py-6 text-center text-sm text-black">도서가 없습니다.</p>
        )}
      </div>
    </DidV2Layout>
  );
}
