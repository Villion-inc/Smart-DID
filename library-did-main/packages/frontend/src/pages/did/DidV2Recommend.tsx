import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getBooksByAge, getVideoStatus, getPopularVideos } from '../../api/did.api';
import type { DidBook } from '../../types';
import { DidV2Layout } from './DidV2Layout';

type TabKey = 'preschool' | 'elementary' | 'teen' | 'librarian';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'preschool', label: '유아' },
  { key: 'elementary', label: '초등' },
  { key: 'teen', label: '청소년' },
  { key: 'librarian', label: '사서추천' },
];

const VALID_TABS: TabKey[] = ['preschool', 'elementary', 'teen', 'librarian'];

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (basePath ? `${basePath}/api` : '/api');

function resolveVideoUrl(url: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('/videos/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/videos/${url.replace(/^\//, '')}`;
}

interface BookWithVideo {
  book: DidBook;
  videoUrl: string;
}

export function DidV2Recommend() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);

  // URL에서 탭 복원 (뒤로가기 시 유지)
  const urlTab = searchParams.get('tab') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey | null>(
    urlTab && VALID_TABS.includes(urlTab) ? urlTab : null
  );

  // 상단 영상 (유아/초등 우선)
  const [featuredVideos, setFeaturedVideos] = useState<BookWithVideo[]>([]);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);

  // 도서 목록
  const [books, setBooks] = useState<DidBook[]>([]);
  const [bookLoading, setBookLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, DidBook[]>>({});

  // 영상 로드: 유아/초등 우선, 없으면 인기 영상 폴백
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [preschoolBooks, elementaryBooks] = await Promise.all([
          getBooksByAge('preschool'),
          getBooksByAge('elementary'),
        ]);
        const priorityBooks = [...preschoolBooks.slice(0, 4), ...elementaryBooks.slice(0, 4)];
        const videoResults = await Promise.all(
          priorityBooks.map(async (book) => {
            try {
              const status = await getVideoStatus(book.id);
              if (status.status === 'READY' && status.videoUrl) {
                return { book, videoUrl: status.videoUrl };
              }
            } catch { /* ignore */ }
            return null;
          })
        );
        const found = videoResults.filter((r): r is BookWithVideo => r !== null);

        if (!cancelled) {
          if (found.length > 0) {
            setFeaturedVideos(found);
          } else {
            // 유아/초등 영상이 없으면 인기 영상으로 폴백
            try {
              const popular = await getPopularVideos(10);
              const fallback: BookWithVideo[] = popular
                .filter(v => v.videoUrl)
                .map(v => ({
                  book: { id: v.bookId, title: v.title, author: v.author, coverImageUrl: v.coverImageUrl, shelfCode: '', category: '' },
                  videoUrl: v.videoUrl,
                }));
              if (!cancelled) setFeaturedVideos(fallback);
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // 카테고리 선택 시 도서 로드
  useEffect(() => {
    if (!activeTab) return;
    if (cache[activeTab]) {
      setBooks(cache[activeTab]);
      setBookLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setBookLoading(true);
      try {
        const list = await getBooksByAge(activeTab as any);
        if (!cancelled) {
          setBooks(list);
          setCache((prev) => ({ ...prev, [activeTab]: list }));
        }
      } catch {
        if (!cancelled) setBooks([]);
      }
      if (!cancelled) setBookLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  // 영상 자동 전환
  const handleVideoEnded = useCallback(() => {
    if (featuredVideos.length <= 1) return;
    setCurrentVideoIdx((prev) => {
      let next: number;
      do { next = Math.floor(Math.random() * featuredVideos.length); } while (next === prev);
      return next;
    });
  }, [featuredVideos.length]);

  useEffect(() => {
    if (featuredVideos.length > 0) {
      setCurrentVideoIdx(Math.floor(Math.random() * featuredVideos.length));
    }
  }, [featuredVideos.length]);

  useEffect(() => {
    if (videoRef.current && featuredVideos.length > 0) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIdx, featuredVideos]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const currentVideo = featuredVideos.length > 0 ? featuredVideos[currentVideoIdx] : null;

  return (
    <DidV2Layout
      title="추천도서"
      hideFooter
      extraFooter={
        <footer
          className="flex w-full shrink-0 items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4"
          style={{
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderTop: '1px solid rgba(255,255,255,0.6)',
          }}
        >
          {/* 홈 버튼 */}
          <button
            type="button"
            onClick={() => navigate('/did')}
            className="flex flex-1 items-center justify-center py-4 text-base font-bold transition active:scale-95 sm:py-5 sm:text-lg"
            style={{
              borderRadius: '1rem',
              background: 'rgba(255,255,255,0.35)',
              color: '#7a8a80',
              border: '2px solid transparent',
            }}
          >
            홈
          </button>

          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className="flex flex-1 items-center justify-center py-4 text-base font-bold transition active:scale-95 sm:py-5 sm:text-lg"
                style={{
                  borderRadius: '1rem',
                  background: active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)',
                  color: active ? '#2D5A4A' : '#7a8a80',
                  boxShadow: active ? '0 3px 12px rgba(60,90,70,0.12), inset 0 1px 0 rgba(255,255,255,0.6)' : 'none',
                  border: active ? '2px solid rgba(60,90,70,0.15)' : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </footer>
      }
    >
      <div className={`flex flex-1 flex-col gap-3 ${!activeTab ? 'justify-center' : ''}`}>
        {/* 영상 — 항상 표시, 탭 미선택 시 중앙 / 선택 시 상단 */}
        <div
          className="relative -mx-4 w-[calc(100%+2rem)] shrink-0 overflow-hidden bg-black sm:-mx-6 sm:w-[calc(100%+3rem)]"
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
              <p className="text-sm text-white/50">영상 준비 중...</p>
            </div>
          )}
        </div>

        {/* 카테고리 선택 후: 도서 목록 */}
        {activeTab && (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto sm:gap-4">
            {bookLoading && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-base text-gray-500 sm:text-lg">불러오는 중...</p>
              </div>
            )}
            {!bookLoading && books.length === 0 && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-base text-gray-500 sm:text-lg">
                  {activeTab === 'librarian' ? '사서 추천 도서가 없습니다.' : '인기 도서를 불러올 수 없습니다.'}
                </p>
              </div>
            )}
            {!bookLoading && books.length > 0 && activeTab !== 'librarian' && (
              <p className="mb-1 shrink-0 text-right text-xs text-gray-400">
                제공기관 : 국립중앙도서관 (도서관 정보나루)
              </p>
            )}
            {!bookLoading &&
              books.map((book, idx) => (
                <button
                  key={book.id || idx}
                  type="button"
                  onClick={() => navigate(`/did/video/${book.id}`)}
                  className="flex w-full shrink-0 items-center gap-3 p-3 text-left transition active:scale-[0.98] sm:gap-4 sm:p-4"
                  style={{
                    borderRadius: '1.2rem',
                    background: 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    boxShadow: '0 2px 10px rgba(60,90,70,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
                    border: '1.5px solid rgba(255,255,255,0.6)',
                  }}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white sm:h-9 sm:w-9 sm:text-base"
                    style={{ background: idx < 3 ? 'linear-gradient(135deg, #5C8FBF, #4A7BA8)' : 'rgba(160,170,165,0.6)' }}
                  >
                    {idx + 1}
                  </span>
                  <div className="relative h-20 w-14 shrink-0 sm:h-24 sm:w-16">
                    <div
                      className="h-full w-full rounded-lg"
                      style={{
                        background: book.coverImageUrl
                          ? `url(${book.coverImageUrl}) center/cover no-repeat`
                          : 'linear-gradient(135deg, #a8d8ea 0%, #d4ead6 100%)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      }}
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-bold text-gray-800 sm:text-lg">{book.title}</span>
                    <span className="mt-0.5 truncate text-sm text-gray-600 sm:text-base">{book.author}</span>
                  </div>
                  <span className="text-xl text-gray-400 sm:text-2xl">&rsaquo;</span>
                </button>
              ))}
          </div>
        )}
      </div>
    </DidV2Layout>
  );
}
