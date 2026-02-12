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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getNewArrivals();
        if (!cancelled) setBooks(list.slice(0, 6));
      } catch (e) {
        if (!cancelled) setBooks([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const emojis = ['📍', '😺', '📍', '😺', '📍', '😺'];

  return (
    <DidV2Layout title="새로 들어온 책">
      <div className="px-4 py-3" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <div className="flex flex-col gap-3">
          {(loading ? [] : books).map((book, i) => (
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
              <span className="text-3xl font-bold">{emojis[i % emojis.length]}</span>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-bold leading-tight text-black">
                  {book.title}
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded-full border border-black bg-white px-2 py-0.5 text-xs">
                    4-6세
                  </span>
                  <span className="rounded-full border border-black bg-white px-2 py-0.5 text-xs">
                    {book.category || '용기'}
                  </span>
                  <span className="rounded-full border border-black bg-white px-2 py-0.5 text-xs">
                    모험
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
        {!loading && books.length === 0 && (
          <p className="py-6 text-center text-sm text-black">신착 도서가 없습니다.</p>
        )}
      </div>
    </DidV2Layout>
  );
}
