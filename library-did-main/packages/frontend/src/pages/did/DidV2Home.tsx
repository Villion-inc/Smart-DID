import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DidV2Layout } from './DidV2Layout';
import { getPopularVideos, getLibrarianPicks } from '../../api/did.api';
import type { PopularVideo } from '../../api/did.api';
import type { DidBook } from '../../types';

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (basePath ? `${basePath}/api` : '/api');

function resolveVideoUrl(url: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('/videos/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/videos/${url.replace(/^\//, '')}`;
}

export function DidV2Home() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videos, setVideos] = useState<PopularVideo[]>([]);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [librarianPicks, setLibrarianPicks] = useState<DidBook[]>([]);
  const [loading, setLoading] = useState(true);

  // 랜덤 영상 팝업
  const [showRandomVideo, setShowRandomVideo] = useState(false);
  const [randomVideo, setRandomVideo] = useState<PopularVideo | null>(null);
  const randomVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [popularRes, picksRes] = await Promise.all([
          getPopularVideos(10).catch(() => [] as PopularVideo[]),
          getLibrarianPicks().catch(() => [] as DidBook[]),
        ]);
        if (cancelled) return;
        setVideos(popularRes.filter(v => v.videoUrl));
        setLibrarianPicks(picksRes);
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleVideoEnded = useCallback(() => {
    setCurrentVideoIdx(prev => (prev + 1) % videos.length);
  }, [videos.length]);

  useEffect(() => {
    if (videoRef.current && videos.length > 0) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIdx, videos]);

  const handleRandomVideo = () => {
    if (videos.length === 0) return;
    const random = videos[Math.floor(Math.random() * videos.length)];
    setRandomVideo(random);
    setShowRandomVideo(true);
  };

  useEffect(() => {
    if (showRandomVideo && randomVideoRef.current) {
      randomVideoRef.current.play().catch(() => {});
    }
  }, [showRandomVideo]);

  const hasVideos = videos.length > 0;
  const currentVideo = hasVideos ? videos[currentVideoIdx] : null;

  if (loading) {
    return (
      <DidV2Layout>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-base text-gray-500 sm:text-lg">불러오는 중...</p>
        </div>
      </DidV2Layout>
    );
  }

  return (
    <DidV2Layout>
      <div className="flex flex-1 flex-col">
        {/* 상단: 영상 (화면 50%) */}
        {currentVideo ? (
          <div
            className="relative w-full shrink-0 overflow-hidden rounded-2xl"
            style={{ height: '50%' }}
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
              <p className="text-lg font-bold text-white sm:text-xl">{currentVideo.title}</p>
              <p className="text-sm text-gray-200 sm:text-base">{currentVideo.author}</p>
            </div>
          </div>
        ) : (
          <div
            className="flex w-full shrink-0 items-center justify-center rounded-2xl bg-gray-100"
            style={{ height: '50%' }}
          >
            <p className="text-base text-gray-400">영상이 아직 없습니다</p>
          </div>
        )}

        {/* 중간: 랜덤 영상 보기 버튼 */}
        {hasVideos && (
          <div className="flex shrink-0 justify-center py-3">
            <button
              type="button"
              onClick={handleRandomVideo}
              className="rounded-full px-6 py-2.5 text-sm font-bold text-white shadow-lg transition active:scale-95 sm:text-base"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              🎬 랜덤 영상 보기
            </button>
          </div>
        )}

        {/* 하단: 추천도서 가로 스크롤 (표지, 제목, 저자만) */}
        {librarianPicks.length > 0 && (
          <div className="min-h-0 flex-1">
            <p className="mb-2 px-1 text-sm font-bold text-gray-700 sm:text-base">추천도서</p>
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {librarianPicks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => navigate(`/did/video/${book.id}`)}
                  className="flex w-28 shrink-0 cursor-pointer flex-col items-center transition active:scale-95 sm:w-32"
                >
                  <div
                    className="mb-1.5 h-36 w-24 rounded-xl shadow-md sm:h-40 sm:w-28"
                    style={{
                      background: book.coverImageUrl
                        ? `url(${book.coverImageUrl}) center/cover no-repeat`
                        : 'linear-gradient(135deg, #a8d8ea 0%, #d4ead6 100%)',
                    }}
                  >
                    {!book.coverImageUrl && (
                      <div className="flex h-full w-full items-center justify-center text-3xl">📚</div>
                    )}
                  </div>
                  <p className="w-full truncate text-center text-xs font-bold text-gray-800 sm:text-sm">
                    {book.title}
                  </p>
                  <p className="w-full truncate text-center text-[10px] text-gray-500 sm:text-xs">
                    {book.author}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 랜덤 영상 팝업 */}
      {showRandomVideo && randomVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={() => setShowRandomVideo(false)}
        >
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={randomVideoRef}
              src={resolveVideoUrl(randomVideo.videoUrl)}
              autoPlay
              playsInline
              controls
              className="w-full"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-lg font-bold text-white">{randomVideo.title}</p>
              <p className="text-sm text-gray-300">{randomVideo.author}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowRandomVideo(false)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-xl text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </DidV2Layout>
  );
}
