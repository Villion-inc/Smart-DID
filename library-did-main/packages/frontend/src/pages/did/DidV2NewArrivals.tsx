import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNewArrivals } from '../../api/did.api';
import type { DidBook } from '../../types';
import { DidV2Layout } from './DidV2Layout';

/**
 * 새로 들어온 책 (키오스크 세로 화면)
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
        if (!cancelled) setBooks(list.slice(0, 8));
      } catch (e) {
        if (!cancelled) setBooks([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DidV2Layout title="새로 들어온 책">
      <div className="flex flex-1 flex-col" style={{ padding: '40px 0' }}>
        <p className="text-center text-gray-600" style={{ fontSize: 36, marginBottom: 40 }}>
          ✨ 이번 주 새로 들어온 책이에요!
        </p>

        <div className="flex flex-1 flex-col overflow-auto" style={{ gap: 24 }}>
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-gray-500" style={{ fontSize: 36 }}>불러오는 중...</p>
            </div>
          )}
          {!loading && books.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-gray-500" style={{ fontSize: 36 }}>신착 도서가 없습니다.</p>
            </div>
          )}
          {!loading &&
            books.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => navigate(`/did/video/${book.id}`)}
                className="flex w-full items-center text-left transition active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.85)', borderRadius: 24, padding: 28, gap: 28 }}
              >
                {/* Cover Image with NEW badge */}
                <div className="relative shrink-0" style={{ width: 120, height: 160 }}>
                  <div
                    className="h-full w-full"
                    style={{
                      borderRadius: 16,
                      background: book.coverImageUrl
                        ? `url(${book.coverImageUrl}) center/cover no-repeat`
                        : 'linear-gradient(180deg, #FFE5A0 0%, #FFD966 100%)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    {!book.coverImageUrl && (
                      <div className="flex h-full w-full items-center justify-center" style={{ fontSize: 48 }}>
                        📚
                      </div>
                    )}
                  </div>
                  {/* NEW Badge */}
                  <div
                    className="absolute flex items-center justify-center font-bold text-white"
                    style={{ width: 48, height: 48, borderRadius: 24, fontSize: 24, background: '#FF6B6B', top: -8, right: -8 }}
                  >
                    N
                  </div>
                </div>
                {/* Book Info */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-bold text-gray-800" style={{ fontSize: 36 }}>
                    {book.title}
                  </span>
                  <span className="truncate text-gray-600" style={{ fontSize: 28, marginTop: 8 }}>
                    {book.author}
                  </span>
                  <div className="flex flex-wrap" style={{ gap: 12, marginTop: 16 }}>
                    <span className="bg-yellow-100 text-yellow-700" style={{ fontSize: 24, padding: '8px 16px', borderRadius: 20 }}>
                      ✨ 신작
                    </span>
                    {book.category && (
                      <span className="bg-gray-100 text-gray-600" style={{ fontSize: 24, padding: '8px 16px', borderRadius: 20 }}>
                        {book.category}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-gray-400" style={{ fontSize: 48 }}>›</span>
              </button>
            ))}
        </div>
      </div>
    </DidV2Layout>
  );
}
