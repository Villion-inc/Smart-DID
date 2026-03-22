import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getBooksByAge } from '../../api/did.api';
import type { DidBook, AgeGroup } from '../../types';
import { DidV2Layout } from './DidV2Layout';
import { VideoPopup } from '../../components/VideoPopup';

const AGE_LABELS: Record<AgeGroup, string> = {
  preschool: '4-6세',
  elementary: '7-9세',
  teen: '10-13세',
};

/**
 * 연령별 추천도서 카드 리스트 (3권) + 영상 팝업
 */
export function DidV2BookGrid() {
  const { group } = useParams<{ group: string }>();
  const ageGroup = (group || 'elementary') as AgeGroup;
  const [books, setBooks] = useState<DidBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getBooksByAge(ageGroup);
        if (!cancelled) setBooks(list);
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
      <div className="flex flex-1 flex-col gap-4 py-4">
        {(loading ? [] : books).map((book) => (
          <div
            key={book.id}
            className="flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-md"
          >
            {/* Card body: cover + info (클릭 비활성화) */}
            <div className="flex gap-4 p-4">
              {/* Cover image */}
              <div
                className="h-32 w-24 shrink-0 rounded-xl"
                style={{
                  background: book.coverImageUrl
                    ? `url(${book.coverImageUrl}) center/cover no-repeat`
                    : 'linear-gradient(180deg, #E0F0F8 0%, #C8E8D0 100%)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
              />
              {/* Info */}
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <h3 className="text-lg font-bold text-gray-800 line-clamp-2 sm:text-xl">
                  {book.title || '제목'}
                </h3>
                <p className="mt-1 text-sm text-gray-500 sm:text-base">
                  {book.author || '저자'}
                </p>
                {book.category && (
                  <span
                    className="mt-2 w-fit rounded-full px-3 py-1 text-xs font-medium text-gray-600 sm:text-sm"
                    style={{ background: 'rgba(107, 184, 214, 0.2)' }}
                  >
                    #{book.category}
                  </span>
                )}
              </div>
            </div>
            {/* Watch video button */}
            <button
              type="button"
              onClick={() => setSelectedBookId(book.id)}
              className="flex h-12 w-full items-center justify-center gap-2 border-t border-gray-100 text-base font-semibold transition active:bg-gray-50 sm:h-14 sm:text-lg"
              style={{ color: '#4DA3C4' }}
            >
              🎬 영상 보기
            </button>
          </div>
        ))}

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

      {/* Video popup modal */}
      {selectedBookId && (
        <VideoPopup
          bookId={selectedBookId}
          onClose={() => setSelectedBookId(null)}
        />
      )}
    </DidV2Layout>
  );
}
