import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DidV2Layout } from './DidV2Layout';
import { HorizontalBookScroll } from '../../components/HorizontalBookScroll';
import { DidBookCard } from '../../components/DidBookCard';
import { getPopularVideos, getNewArrivals, getLibrarianPicks } from '../../api/did.api';
import type { PopularVideo } from '../../api/did.api';
import type { DidBook, AgeGroup } from '../../types';

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (basePath ? `${basePath}/api` : '/api');

function resolveVideoUrl(url: string): string {
  if (url.startsWith('http')) return url;
  if (url.startsWith('/videos/')) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/videos/${url.replace(/^\//, '')}`;
}

/** 연령 선택 fallback (영상 없을 때) */
const AGE_OPTIONS: { group: AgeGroup; label: string; sub: string; emoji: string }[] = [
  { group: 'preschool', label: '4-6세', sub: '그림책 · 짧은 문장', emoji: '🐣' },
  { group: 'elementary', label: '7-9세', sub: '호기심 · 질문형 자막', emoji: '🌟' },
  { group: 'teen', label: '10-13세', sub: '탐구 · 주제/키워드 강화', emoji: '🚀' },
];

export function DidV2Home() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videos, setVideos] = useState<PopularVideo[]>([]);
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [newArrivals, setNewArrivals] = useState<DidBook[]>([]);
  const [librarianPicks, setLibrarianPicks] = useState<DidBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [popularRes, newRes, picksRes] = await Promise.all([
          getPopularVideos(10).catch(() => [] as PopularVideo[]),
          getNewArrivals().catch(() => [] as DidBook[]),
          getLibrarianPicks().catch(() => [] as DidBook[]),
        ]);
        if (cancelled) return;
        setVideos(popularRes.filter(v => v.videoUrl));
        setNewArrivals(newRes);
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

  // 영상 변경 시 자동 재생
  useEffect(() => {
    if (videoRef.current && videos.length > 0) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIdx, videos]);

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

  // 영상 없으면 기존 연령선택 fallback
  if (!hasVideos && newArrivals.length === 0 && librarianPicks.length === 0) {
    return (
      <DidV2Layout>
        <div className="flex flex-1 flex-col items-center justify-center py-6 sm:py-10">
          <p className="mb-2 text-center text-2xl font-bold text-gray-800 sm:mb-4 sm:text-3xl md:text-4xl">
            누가 볼까요?
          </p>
          <p className="mb-8 text-center text-base text-gray-600 sm:mb-12 sm:text-lg md:text-xl">
            연령을 선택하면 추천 영상과 문장이 맞춰져요.
          </p>
          <div className="flex w-full flex-col items-center gap-4 sm:gap-6">
            {AGE_OPTIONS.map(({ group, label, sub, emoji }) => (
              <button
                key={group}
                type="button"
                onClick={() => navigate(`/did/age/${group}`)}
                className="flex w-full items-center gap-4 rounded-2xl p-4 text-left transition active:scale-[0.98] sm:gap-6 sm:rounded-3xl sm:p-6"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl sm:h-20 sm:w-20 sm:text-4xl md:h-24 md:w-24 md:text-5xl"
                  style={{ background: 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)' }}
                >
                  {emoji}
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-xl font-bold text-gray-800 sm:text-2xl md:text-3xl">{label}</span>
                  <span className="mt-1 text-sm text-gray-500 sm:mt-2 sm:text-base md:text-lg">{sub}</span>
                </div>
                <span className="text-2xl text-gray-400 sm:text-3xl">›</span>
              </button>
            ))}
          </div>
        </div>
      </DidV2Layout>
    );
  }

  return (
    <DidV2Layout>
      <div className="flex flex-1 flex-col gap-6 py-2">
        {/* 상단: 영상 자동 순환 재생 */}
        {currentVideo && (
          <div
            className="relative w-full overflow-hidden rounded-2xl"
            style={{ aspectRatio: '2/1' }}
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
            {/* 제목/저자 오버레이 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-lg font-bold text-white sm:text-xl">{currentVideo.title}</p>
              <p className="text-sm text-gray-200 sm:text-base">{currentVideo.author}</p>
            </div>
          </div>
        )}

        {/* 중단: 신착도서 가로 스크롤 */}
        {newArrivals.length > 0 && (
          <div className="-mx-4 sm:-mx-6">
            <HorizontalBookScroll title="신착도서">
              {newArrivals.map((book) => (
                <DidBookCard
                  key={book.id}
                  book={book}
                  onClick={() => navigate(`/did/video/${book.id}`)}
                />
              ))}
            </HorizontalBookScroll>
          </div>
        )}

        {/* 하단: 사서추천도서 가로 스크롤 */}
        {librarianPicks.length > 0 && (
          <div className="-mx-4 sm:-mx-6">
            <HorizontalBookScroll title="사서추천도서">
              {librarianPicks.map((book) => (
                <DidBookCard
                  key={book.id}
                  book={book}
                  onClick={() => navigate(`/did/video/${book.id}`)}
                />
              ))}
            </HorizontalBookScroll>
          </div>
        )}
      </div>
    </DidV2Layout>
  );
}
