import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLibrarianPicks, getVideoStatus, getSiteSettings } from '../../api/did.api';
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

export function DidV2Recommend() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [books, setBooks] = useState<DidBook[]>([]);
  const [booksWithVideo, setBooksWithVideo] = useState<BookWithVideo[]>([]);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('사서가 추천하는 도서 목록이에요!');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [list, settings] = await Promise.all([
          getLibrarianPicks(),
          getSiteSettings().catch(() => ({} as Record<string, string>)),
        ]);
        if (cancelled) return;
        setBooks(list);
        const desc = (settings as Record<string, string>)['recommend.description'];
        if (desc) setDescription(desc);

        // 각 책의 영상 상태 확인
        const videoResults = await Promise.all(
          list.slice(0, 10).map(async (book) => {
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
        if (!cancelled) setBooks([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleVideoEnded = useCallback(() => {
    setCurrentVideoIdx(prev => (prev + 1) % booksWithVideo.length);
  }, [booksWithVideo.length]);

  useEffect(() => {
    if (videoRef.current && booksWithVideo.length > 0) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIdx, booksWithVideo]);

  const currentVideo = booksWithVideo.length > 0 ? booksWithVideo[currentVideoIdx] : null;

  return (
    <DidV2Layout title="추천도서">
      <div className="flex flex-1 flex-col py-4">
        {/* 상단: 영상 자동 재생 */}
        {currentVideo && (
          <div
            className="relative mb-4 w-full overflow-hidden rounded-2xl bg-black"
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

        <p className="mb-4 text-center text-base text-gray-600 sm:text-lg">
          {description}
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
