import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNewArrivals, getVideoStatus } from '../../api/did.api';
import type { DidBook } from '../../types';
import { DidV2Layout } from './DidV2Layout';

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (basePath ? `${basePath}/api` : '/api');

interface BookWithVideo {
  book: DidBook;
  videoUrl: string;
}

function resolveVideoUrl(url: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('/videos/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/videos/${url.replace(/^\//, '')}`;
}

type ShelfFilter = 'all' | 'children' | 'teen';

const SHELF_FILTERS: { key: ShelfFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'children', label: '어린이' },
  { key: 'teen', label: '청소년' },
];

function filterByShelf(books: DidBook[], filter: ShelfFilter): DidBook[] {
  if (filter === 'all') return books;
  if (filter === 'children') return books.filter(b => b.shelfCode.includes('1층'));
  if (filter === 'teen') return books.filter(b => b.shelfCode.includes('청소년'));
  return books;
}

const PAGE_SIZE = 20;

/**
 * 새로 들어온 책 (키오스크 세로 화면)
 * 상단: 영상이 있는 신착도서 자동 재생
 * 하단: 연령 필터 + 20권씩 페이지네이션
 */
export function DidV2NewArrivals() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [allBooks, setAllBooks] = useState<DidBook[]>([]);
  const [booksWithVideo, setBooksWithVideo] = useState<BookWithVideo[]>([]);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [shelfFilter, setShelfFilter] = useState<ShelfFilter>('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getNewArrivals();
        if (cancelled) return;
        setAllBooks(list);

        // 각 책의 영상 상태 확인
        const videoResults = await Promise.all(
          list.slice(0, 8).map(async (book) => {
            try {
              const status = await getVideoStatus(book.id);
              if (status.status === 'READY' && status.videoUrl) {
                return { book, videoUrl: status.videoUrl };
              }
            } catch { /* ignore */ }
            return null;
          })
        );
        if (!cancelled) {
          setBooksWithVideo(videoResults.filter((r): r is BookWithVideo => r !== null));
        }
      } catch {
        if (!cancelled) setAllBooks([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // 랜덤 다음 영상
  const handleVideoEnded = useCallback(() => {
    if (booksWithVideo.length <= 1) return;
    setCurrentVideoIdx(prev => {
      let next: number;
      do { next = Math.floor(Math.random() * booksWithVideo.length); } while (next === prev);
      return next;
    });
  }, [booksWithVideo.length]);

  // 최초 랜덤 시작
  useEffect(() => {
    if (booksWithVideo.length > 0) {
      setCurrentVideoIdx(Math.floor(Math.random() * booksWithVideo.length));
    }
  }, [booksWithVideo.length]);

  useEffect(() => {
    if (videoRef.current && booksWithVideo.length > 0) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIdx, booksWithVideo]);

  const currentVideo = booksWithVideo.length > 0 ? booksWithVideo[currentVideoIdx] : null;

  const filteredBooks = filterByShelf(allBooks, shelfFilter);
  const totalPages = Math.ceil(filteredBooks.length / PAGE_SIZE);
  const pagedBooks = filteredBooks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilterChange = (f: ShelfFilter) => {
    setShelfFilter(f);
    setPage(0);
  };

  return (
    <DidV2Layout title="새로 들어온 책">
      <div className="flex flex-1 flex-col py-4">
        {/* 상단: 영상 자동 재생 */}
        {currentVideo && (
          <div
            className="relative -mx-4 mb-4 w-[calc(100%+2rem)] shrink-0 overflow-hidden bg-black sm:-mx-6 sm:w-[calc(100%+3rem)]"
            style={{ aspectRatio: '16/9' }}
          >
            <video
              ref={videoRef}
              src={resolveVideoUrl(currentVideo.videoUrl)}
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnded}
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-lg font-bold text-white sm:text-xl">{currentVideo.book.title}</p>
              <p className="text-sm text-gray-200 sm:text-base">{currentVideo.book.author}</p>
            </div>
          </div>
        )}

        {/* 연령 필터 버튼 */}
        <div className="mb-3 flex shrink-0 gap-2">
          {SHELF_FILTERS.map((f) => {
            const active = shelfFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => handleFilterChange(f.key)}
                className="flex-1 py-2.5 text-sm font-bold transition active:scale-95 sm:py-3 sm:text-base"
                style={{
                  borderRadius: '0.8rem',
                  background: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
                  color: active ? '#2D5A4A' : '#7a8a80',
                  boxShadow: active ? '0 2px 8px rgba(60,90,70,0.12), inset 0 1px 0 rgba(255,255,255,0.6)' : 'none',
                  border: active ? '1.5px solid rgba(60,90,70,0.15)' : '1.5px solid transparent',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* 페이지 안내 */}
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <p className="text-base font-bold text-gray-700 sm:text-lg">
            이번 주 새로 들어온 책이에요!
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-gray-500">
              {page + 1} / {totalPages}
            </p>
          )}
        </div>

        {/* 도서 목록 */}
        <div className="flex flex-1 flex-col gap-3 overflow-auto sm:gap-4">
          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-base text-gray-500 sm:text-lg">불러오는 중...</p>
            </div>
          )}
          {!loading && filteredBooks.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-base text-gray-500 sm:text-lg">
                {shelfFilter === 'all' ? '신착 도서가 없습니다.' : '해당 연령대 신착 도서가 없습니다.'}
              </p>
            </div>
          )}
          {!loading &&
            pagedBooks.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => navigate(`/did/video/${book.id}`)}
                className="flex w-full items-center gap-3 p-3 text-left transition active:scale-[0.98] sm:gap-4 sm:p-4"
                style={{
                  borderRadius: '1.2rem',
                  background: 'rgba(255,255,255,0.55)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  boxShadow: '0 2px 10px rgba(60,90,70,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                }}
              >
                <div className="relative h-20 w-14 shrink-0 sm:h-24 sm:w-16">
                  <div
                    className="h-full w-full rounded-lg"
                    style={{
                      background: book.coverImageUrl
                        ? `url(${book.coverImageUrl}) center/cover no-repeat`
                        : 'linear-gradient(180deg, #FFE5A0 0%, #FFD966 100%)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    {!book.coverImageUrl && (
                      <div className="flex h-full w-full items-center justify-center text-2xl">📚</div>
                    )}
                  </div>
                  <div
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white sm:h-6 sm:w-6 sm:text-xs"
                    style={{ background: '#FF6B6B' }}
                  >
                    N
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base font-bold text-gray-800 sm:text-lg">
                    {book.title}
                  </span>
                  <span className="mt-0.5 truncate text-sm text-gray-600 sm:text-base">
                    {book.author}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1 sm:gap-2">
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 sm:text-sm">
                      신작
                    </span>
                    {book.shelfCode && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600 sm:text-sm">
                        {book.shelfCode}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xl text-gray-400 sm:text-2xl">›</span>
              </button>
            ))}
        </div>

        {/* 페이지네이션 버튼 */}
        {!loading && totalPages > 1 && (
          <div className="flex shrink-0 gap-3 pt-4">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="flex h-14 flex-1 items-center justify-center rounded-2xl text-base font-bold transition active:scale-95 disabled:opacity-30 sm:h-16 sm:text-lg"
              style={{ background: 'rgba(255,255,255,0.8)' }}
            >
              ← 이전
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="flex h-14 flex-1 items-center justify-center rounded-2xl text-base font-bold text-white transition active:scale-95 disabled:opacity-30 sm:h-16 sm:text-lg"
              style={{ background: 'linear-gradient(180deg, #A8D8EA 0%, #8BC9E0 100%)' }}
            >
              다음 →
            </button>
          </div>
        )}
      </div>
    </DidV2Layout>
  );
}
