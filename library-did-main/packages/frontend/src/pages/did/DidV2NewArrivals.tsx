import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNewArrivals } from '../../api/did.api';
import type { DidBook } from '../../types';
import { DidV2Layout } from './DidV2Layout';

/**
 * Frame 22 - 새로 들어온 책 목록 (698×228 카드, 이모지+제목+태그)
 */
export function DidV2NewArrivals() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<DidBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      setLoading(true);
      try {
        const list = await getNewArrivals();
        if (!cancelled) {
          setBooks(list.slice(0, 6));
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setBooks([]);
          setError('신착 도서를 불러오지 못했습니다.');
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const emojis = ['📍', '😺', '📍', '😺', '📍', '😺'];

  return (
    <DidV2Layout title="새로 들어온 책">
      <div
        className="flex w-full max-w-[480px] flex-1 flex-col items-center px-4 py-4"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        <div className="flex w-full flex-col items-center gap-4">
          {(loading ? [] : books).map((book, i) => (
            <button
              key={book.id}
              type="button"
              onClick={() => navigate(`/did/video/${book.id}`)}
              className="flex w-full max-w-[420px] items-center gap-4 rounded-3xl px-5 py-4 text-left transition active:scale-[0.98]"
              style={{
                background: 'linear-gradient(180deg, rgba(184, 230, 245, 0.85) 0%, rgba(168, 216, 234, 0.75) 100%)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(255,255,255,0.5) inset',
              }}
            >
              {book.coverImageUrl ? (
                <img
                  src={book.coverImageUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover shadow"
                />
              ) : (
                <span className="text-4xl drop-shadow-sm" aria-hidden>
                  {emojis[i % emojis.length]}
                </span>
              )}
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-base font-bold leading-tight text-gray-800 drop-shadow-sm">
                  {book.title}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium text-gray-700"
                    style={{ background: 'rgba(255,255,255,0.5)' }}
                  >
                    {book.category || '용기'}
                  </span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium text-gray-700"
                    style={{ background: 'rgba(255,255,255,0.5)' }}
                  >
                    모험
                  </span>
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-500 shrink-0" aria-hidden>
                ›
              </span>
            </button>
          ))}
        </div>
        {error && (
          <p className="w-full py-4 text-center text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && books.length === 0 && (
          <p className="flex flex-1 items-center py-8 text-center text-base text-gray-600">신착 도서가 없습니다.</p>
        )}
      </div>
    </DidV2Layout>
  );
}
