import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLibrarianPicks } from '../../api/did.api';
import type { DidBook } from '../../types';
import { DidV2Layout } from './DidV2Layout';

/**
 * 추천도서 목록 페이지
 */
export function DidV2Recommend() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<DidBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getLibrarianPicks();
        if (!cancelled) setBooks(list);
      } catch {
        if (!cancelled) setBooks([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <DidV2Layout title="추천도서">
      <div className="flex flex-1 flex-col py-4">
        <p className="mb-4 text-center text-base text-gray-600 sm:text-lg">
          사서가 추천하는 도서 목록이에요!
        </p>

        <div className="flex flex-1 flex-col gap-3 overflow-auto sm:gap-4">
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-base text-gray-500 sm:text-lg">불러오는 중...</p>
            </div>
          )}
          {!loading && books.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-base text-gray-500 sm:text-lg">추천 도서가 없습니다.</p>
            </div>
          )}
          {!loading &&
            books.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => navigate(`/did/video/${book.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98] sm:gap-4 sm:p-4"
                style={{ background: 'rgba(255,255,255,0.85)' }}
              >
                <div className="relative h-20 w-14 shrink-0 sm:h-24 sm:w-16">
                  <div
                    className="h-full w-full rounded-lg"
                    style={{
                      background: book.coverImageUrl
                        ? `url(${book.coverImageUrl}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #a8d8ea 0%, #d4ead6 100%)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    {!book.coverImageUrl && (
                      <div className="flex h-full w-full items-center justify-center text-2xl">📚</div>
                    )}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-bold text-gray-800 sm:text-lg">
                    {book.title}
                  </span>
                  <span className="mt-0.5 truncate text-sm text-gray-600 sm:text-base">
                    {book.author}
                  </span>
                  {book.category && (
                    <span className="mt-1 inline-block w-fit rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 sm:text-sm">
                      {book.category}
                    </span>
                  )}
                </div>
                <span className="text-xl text-gray-400 sm:text-2xl">›</span>
              </button>
            ))}
        </div>
      </div>
    </DidV2Layout>
  );
}
