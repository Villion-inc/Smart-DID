import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getNewArrivals, getPopularVideos } from '../../api/did.api';
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

type ShelfFilter = 'all' | 'children' | 'teen' | 'general';

// 초기 그리드 (3개: 전체 full-width + 어린이/청소년 2열)
const GRID_FILTERS: { key: ShelfFilter; label: string; color: string; bg: string; border: string }[] = [
  { key: 'all',      label: '전체',   color: '#3B7A6A', bg: 'rgba(200,228,218,0.7)',  border: 'rgba(80,150,130,0.3)' },
  { key: 'children', label: '어린이', color: '#5A7BAA', bg: 'rgba(200,218,238,0.7)',  border: 'rgba(90,123,170,0.3)' },
  { key: 'teen',     label: '청소년', color: '#8A6F9E', bg: 'rgba(225,210,235,0.7)',  border: 'rgba(138,111,158,0.3)' },
];

// 선택 후 컴팩트 푸터 (3개 일렬)
const COMPACT_FILTERS: { key: ShelfFilter; label: string; color: string; bg: string; border: string }[] = [
  { key: 'all',      label: '전체',   color: '#3B7A6A', bg: 'rgba(200,228,218,0.7)',  border: 'rgba(80,150,130,0.3)' },
  { key: 'children', label: '어린이', color: '#5A7BAA', bg: 'rgba(200,218,238,0.7)',  border: 'rgba(90,123,170,0.3)' },
  { key: 'teen',     label: '청소년', color: '#8A6F9E', bg: 'rgba(225,210,235,0.7)',  border: 'rgba(138,111,158,0.3)' },
];

function filterByShelf(books: DidBook[], filter: ShelfFilter): DidBook[] {
  if (filter === 'all') return books;
  if (filter === 'children') return books.filter(b => b.shelfCode.includes('1층'));
  if (filter === 'teen') return books.filter(b => !b.shelfCode.includes('1층'));
  if (filter === 'general') return books.filter(b => !b.shelfCode.includes('1층') && !b.shelfCode.includes('청소년'));
  return books;
}

const PAGE_SIZE = 20;

/**
 * 새로 들어온 책 (키오스크 세로 화면)
 * 초기: 영상 자동재생 + 연령 카테고리 2×2 버튼
 * 선택 후: 영상 + 도서 목록 + 하단 컴팩트 카테고리 버튼
 */
export function DidV2NewArrivals() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [allBooks, setAllBooks] = useState<DidBook[]>([]);
  const [booksWithVideo, setBooksWithVideo] = useState<BookWithVideo[]>([]);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // URL 쿼리 파라미터로 관리 — 뒤로가기 시 필터 상태 유지
  const activeFilter = (searchParams.get('filter') as ShelfFilter | null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getNewArrivals();
        if (cancelled) return;
        setAllBooks(list);

        // 신착도서 슬라이드쇼: 인기 영상 사용 (N+1 video 요청 방지)
        try {
          const popular = await getPopularVideos(10);
          const fallback: BookWithVideo[] = popular
            .filter(v => v.videoUrl)
            .map(v => ({
              book: { id: v.bookId, title: v.title, author: v.author, coverImageUrl: v.coverImageUrl, shelfCode: '', category: '' },
              videoUrl: v.videoUrl,
            }));
          if (!cancelled) setBooksWithVideo(fallback);
        } catch { /* ignore */ }
      } catch {
        if (!cancelled) setAllBooks([]);
      }
      if (!cancelled) {
        setLoading(false);
        // 디버그: shelfCode 분포 확인
        console.log('[NewArrivals] shelfCodes:', [...new Set(allBooks.map(b => b.shelfCode))]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleVideoEnded = useCallback(() => {
    if (booksWithVideo.length <= 1) return;
    setCurrentVideoIdx(prev => {
      let next: number;
      do { next = Math.floor(Math.random() * booksWithVideo.length); } while (next === prev);
      return next;
    });
  }, [booksWithVideo.length]);

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

  const handleFilterChange = (f: ShelfFilter) => {
    setSearchParams({ filter: f });
    setPage(0);
  };

  const currentVideo = booksWithVideo.length > 0 ? booksWithVideo[currentVideoIdx] : null;
  const filteredBooks = activeFilter ? filterByShelf(allBooks, activeFilter) : [];
  const totalPages = Math.ceil(filteredBooks.length / PAGE_SIZE);
  const pagedBooks = filteredBooks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // 카테고리 선택 후 하단 컴팩트 버튼 (3개 한 줄) — 홈 버튼은 하단 네비에 이미 있으므로 제외
  const compactFooter = (
    <div
      className="flex w-full shrink-0 gap-2 px-3 pb-3 pt-2 sm:px-4"
      style={{
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.5)',
      }}
    >
      {COMPACT_FILTERS.map((f) => {
        const active = activeFilter === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => handleFilterChange(f.key)}
            className="flex-1 py-3 text-sm font-bold transition active:scale-95 sm:text-base"
            style={{
              borderRadius: '0.9rem',
              background: active ? 'rgba(255,255,255,0.9)' : f.bg,
              color: f.color,
              boxShadow: active ? `0 2px 10px ${f.border}, inset 0 1px 0 rgba(255,255,255,0.6)` : 'none',
              border: active ? `2px solid ${f.border}` : `1.5px solid ${f.border}`,
              fontWeight: active ? 800 : 600,
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <DidV2Layout
      title="새로 들어온 책"
      extraFooter={activeFilter !== null ? compactFooter : undefined}
    >
      <div className={`flex flex-1 flex-col ${activeFilter === null ? 'gap-4' : 'gap-3'} py-2`}>
        {/* 상단: 영상 영역 — 항상 표시 */}
        <div
          className="relative -mx-4 w-[calc(100%+2rem)] shrink-0 overflow-hidden bg-gray-900 sm:-mx-6 sm:w-[calc(100%+3rem)]"
          style={{ aspectRatio: '16/9' }}
        >
          {currentVideo ? (
            <>
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
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-white/40">영상 준비 중...</p>
            </div>
          )}
        </div>

        {/* ── 카테고리 미선택: 완전한 2×2 그리드 ── */}
        {activeFilter === null && (
          <div className="flex flex-col gap-3">
            <p className="text-center text-sm font-semibold text-gray-600 sm:text-base">
              어떤 책을 보고 싶으신가요?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {GRID_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => handleFilterChange(f.key)}
                  className="flex items-center justify-center py-10 transition active:scale-[0.96] sm:py-12"
                  style={{
                    borderRadius: '1.2rem',
                    background: f.bg,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    boxShadow: `0 4px 16px ${f.border}, inset 0 1px 0 rgba(255,255,255,0.5)`,
                    border: `2px solid ${f.border}`,
                  }}
                >
                  <span className="text-2xl font-extrabold sm:text-3xl" style={{ color: f.color }}>
                    {f.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 카테고리 선택 후: 도서 목록 ── */}
        {activeFilter !== null && (
          <>
            {/* 페이지 안내 */}
            <div className="flex shrink-0 items-center justify-between">
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
                    해당 구역 신착 도서가 없습니다.
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
              <div className="flex shrink-0 gap-3 pt-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="flex h-12 flex-1 items-center justify-center rounded-2xl text-base font-bold transition active:scale-95 disabled:opacity-30 sm:h-14 sm:text-lg"
                  style={{ background: 'rgba(255,255,255,0.8)' }}
                >
                  ← 이전
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="flex h-12 flex-1 items-center justify-center rounded-2xl text-base font-bold text-white transition active:scale-95 disabled:opacity-30 sm:h-14 sm:text-lg"
                  style={{ background: 'linear-gradient(180deg, #A8D8EA 0%, #8BC9E0 100%)' }}
                >
                  다음 →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DidV2Layout>
  );
}
