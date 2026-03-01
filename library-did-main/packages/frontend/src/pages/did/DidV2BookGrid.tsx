import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBooksByAge } from '../../api/did.api';
import type { DidBook, AgeGroup } from '../../types';
import { DidV2Layout } from './DidV2Layout';

const AGE_LABELS: Record<AgeGroup, string> = {
  preschool: '4-6세',
  elementary: '7-9세',
  teen: '10-13세',
};

/**
 * 연령별 도서 3×3 그리드 (키오스크 세로 화면)
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
    return () => {
      cancelled = true;
    };
  }, [ageGroup]);

  return (
    <DidV2Layout title={`${AGE_LABELS[ageGroup]} 추천도서`}>
      <div className="flex flex-1 flex-col py-4">
        <div className="grid w-full grid-cols-3 gap-3 sm:gap-4">
          {(loading ? [] : books).map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => navigate(`/did/video/${book.id}`)}
              className="flex flex-col items-center transition active:scale-[0.97]"
            >
              <div
                className="relative w-full overflow-hidden rounded-xl"
                style={{
                  aspectRatio: '3/4',
                  background: book.coverImageUrl
                    ? `url(${book.coverImageUrl}) center/cover no-repeat`
                    : 'linear-gradient(180deg, #E0F0F8 0%, #C8E8D0 100%)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              >
                {!book.coverImageUrl && (
                  <div className="absolute inset-0 flex items-center justify-center text-3xl sm:text-4xl">
                    📚
                  </div>
                )}
              </div>
              <span className="mt-2 w-full truncate text-center text-sm font-medium text-gray-800 sm:text-base">
                {book.title || '제목'}
              </span>
            </button>
          ))}
        </div>
        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-base text-gray-500 sm:text-lg">불러오는 중...</p>
          </div>
        )}
        {!loading && books.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-base text-gray-500 sm:text-lg">도서가 없습니다.</p>
          </div>
        )}
      </div>
    </DidV2Layout>
  );
}
