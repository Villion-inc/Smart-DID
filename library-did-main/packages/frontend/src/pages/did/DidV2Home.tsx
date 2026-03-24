import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DidV2Layout } from './DidV2Layout';
import { getPopularVideos } from '../../api/did.api';
import type { PopularVideo } from '../../api/did.api';

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
        const popularRes = await getPopularVideos(10).catch(() => [] as PopularVideo[]);
        if (!cancelled) setVideos(popularRes.filter(v => v.videoUrl));
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // 랜덤 다음 영상
  const handleVideoEnded = useCallback(() => {
    if (videos.length <= 1) return;
    setCurrentVideoIdx(prev => {
      let next: number;
      do { next = Math.floor(Math.random() * videos.length); } while (next === prev);
      return next;
    });
  }, [videos.length]);

  // 최초 랜덤 시작
  useEffect(() => {
    if (videos.length > 0) {
      setCurrentVideoIdx(Math.floor(Math.random() * videos.length));
    }
  }, [videos.length]);

  useEffect(() => {
    if (videoRef.current && videos.length > 0) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIdx, videos]);

  const handleRandomVideo = () => {
    if (videos.length === 0) return;
    const others = videos.filter((_, i) => i !== currentVideoIdx);
    const pool = others.length > 0 ? others : videos;
    const random = pool[Math.floor(Math.random() * pool.length)];
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
            className="relative w-full shrink-0 overflow-hidden rounded-2xl bg-black"
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
          <div className="flex shrink-0 justify-center px-4 py-2">
            <button
              type="button"
              onClick={handleRandomVideo}
              className="rounded-full px-8 py-3 text-base font-bold text-white shadow-md transition active:scale-95 sm:text-lg"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              🎬 랜덤 영상 보기
            </button>
          </div>
        )}

        {/* 하단: 바로가기 메뉴 3개 */}
        <div className="flex min-h-0 flex-1 items-center gap-3 px-2">
          {[
            { label: '추천도서', sub: '사서 추천', path: '/did/recommend' },
            { label: '신착도서', sub: '새로 들어온 책', path: '/did/new' },
            { label: '도서검색', sub: '직접 찾아보기', path: '/did/search' },
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl py-6 transition active:scale-95 sm:py-7"
              style={{
                background: 'rgba(255,255,255,0.8)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              }}
            >
              <span className="text-lg font-bold text-gray-800 sm:text-xl">
                {item.label}
              </span>
              <span className="text-xs text-gray-500 sm:text-sm">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 랜덤 영상 팝업 — 풀스크린 */}
      {showRandomVideo && randomVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
          onClick={() => setShowRandomVideo(false)}
        >
          <video
            ref={randomVideoRef}
            src={resolveVideoUrl(randomVideo.videoUrl)}
            autoPlay
            playsInline
            controls
            className="h-full w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <p className="text-xl font-bold text-white sm:text-2xl">{randomVideo.title}</p>
            <p className="text-base text-gray-300 sm:text-lg">{randomVideo.author}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowRandomVideo(false)}
            className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-2xl text-white"
          >
            ✕
          </button>
        </div>
      )}
    </DidV2Layout>
  );
}
