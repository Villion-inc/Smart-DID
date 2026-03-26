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

  // 랜덤 영상 연속 재생 모드
  const [randomMode, setRandomMode] = useState(false);
  const [randomVideoIdx, setRandomVideoIdx] = useState(0);
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

  // 메인 영상 종료 시 다음 랜덤
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

  // 랜덤 모드 진입
  const enterRandomMode = () => {
    if (videos.length === 0) return;
    let next: number;
    do { next = Math.floor(Math.random() * videos.length); } while (next === currentVideoIdx && videos.length > 1);
    setRandomVideoIdx(next);
    setRandomMode(true);
  };

  // 랜덤 모드: 영상 끝나면 자동으로 다음 재생
  const handleRandomVideoEnded = useCallback(() => {
    if (videos.length <= 1) return;
    setRandomVideoIdx(prev => {
      let next: number;
      do { next = Math.floor(Math.random() * videos.length); } while (next === prev);
      return next;
    });
  }, [videos.length]);

  // 랜덤 모드 영상 변경 시 자동 재생
  useEffect(() => {
    if (randomMode && randomVideoRef.current) {
      randomVideoRef.current.load();
      randomVideoRef.current.play().catch(() => {});
    }
  }, [randomMode, randomVideoIdx]);

  const hasVideos = videos.length > 0;
  const currentVideo = hasVideos ? videos[currentVideoIdx] : null;
  const currentRandomVideo = hasVideos ? videos[randomVideoIdx] : null;

  if (loading) {
    return (
      <DidV2Layout>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-base text-gray-500 sm:text-lg">불러오는 중...</p>
        </div>
      </DidV2Layout>
    );
  }

  // ─── 랜덤 영상 연속 재생 모드 ───
  if (randomMode && currentRandomVideo) {
    return (
      <DidV2Layout hideFooter hideHeader>
        <div className="flex flex-1 flex-col">
          {/* 영상 — 최대한 크게 */}
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-black">
            <video
              ref={randomVideoRef}
              src={resolveVideoUrl(currentRandomVideo.videoUrl)}
              autoPlay
              muted
              playsInline
              onEnded={handleRandomVideoEnded}
              className="h-full w-full object-contain"
            />
            {/* 책 정보 오버레이 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-5 pt-12">
              <p className="text-lg font-bold text-white sm:text-xl">{currentRandomVideo.title}</p>
              <p className="mt-1 text-sm text-gray-300 sm:text-base">{currentRandomVideo.author}</p>
            </div>
          </div>

          {/* 하단 컨트롤 바 */}
          <div className="flex shrink-0 items-center gap-3 px-2 py-3">
            <button
              type="button"
              onClick={() => setRandomMode(false)}
              className="flex h-14 items-center justify-center rounded-2xl px-5 text-base font-semibold text-gray-600 transition active:scale-[0.97] sm:h-16 sm:text-lg"
              style={{ background: 'rgba(255,255,255,0.85)' }}
            >
              ← 홈으로
            </button>
            <button
              type="button"
              onClick={handleRandomVideoEnded}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-bold text-white transition active:scale-[0.97] sm:h-16 sm:text-lg"
              style={{
                background: 'linear-gradient(180deg, #667eea 0%, #5a67d8 100%)',
                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.35)',
              }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5m0 0v5m0-5l-6 6M4 21l6-6m-6 0h5m-5 0v-5" />
              </svg>
              다음 랜덤 영상
            </button>
          </div>
        </div>
      </DidV2Layout>
    );
  }

  // ─── 기본 홈 화면 ───
  return (
    <DidV2Layout hideFooter>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-1">
        {/* 영상 */}
        <div className="w-full shrink-0">
          {currentVideo ? (
            <div
              className="relative w-full overflow-hidden rounded-3xl bg-black"
              style={{ aspectRatio: '16 / 9', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}
            >
              <video
                ref={videoRef}
                src={resolveVideoUrl(currentVideo.videoUrl)}
                autoPlay
                muted
                playsInline
                onEnded={handleVideoEnded}
                className="h-full w-full object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="text-lg font-bold text-white sm:text-xl">{currentVideo.title}</p>
                <p className="text-sm text-gray-200 sm:text-base">{currentVideo.author}</p>
              </div>
            </div>
          ) : (
            <div
              className="flex w-full items-center justify-center rounded-2xl"
              style={{
                aspectRatio: '16 / 9',
                background: 'rgba(255,255,255,0.5)',
              }}
            >
              <div className="text-center">
                <svg className="h-10 w-10 text-gray-400 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
                </svg>
                <p className="mt-3 text-base text-gray-500 sm:text-lg">영상이 아직 없습니다</p>
              </div>
            </div>
          )}
        </div>

        {/* 중간: 랜덤 영상 보기 버튼 */}
        {hasVideos && (
          <button
            type="button"
            onClick={enterRandomMode}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition active:scale-[0.97] sm:py-5 sm:text-lg"
            style={{
              background: 'linear-gradient(180deg, #667eea 0%, #5a67d8 100%)',
              boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
            }}
          >
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5m0 0v5m0-5l-6 6M4 21l6-6m-6 0h5m-5 0v-5" />
            </svg>
            랜덤 영상 보기
          </button>
        )}

        {/* 하단: 바로가기 메뉴 3개 */}
        <div className="flex w-full shrink-0 gap-3">
          {[
            { label: '추천도서', sub: '사서 추천', path: '/did/recommend', bg: 'linear-gradient(135deg, #E8F4FC 0%, #d0ecf5 100%)', accent: '#4DA3C4' },
            { label: '신착도서', sub: '새로 들어온 책', path: '/did/new', bg: 'linear-gradient(135deg, #E8F8EC 0%, #d0f0d6 100%)', accent: '#5BB88C' },
            { label: '도서검색', sub: '직접 찾아보기', path: '/did/search', bg: 'linear-gradient(135deg, #F0ECF8 0%, #e0d8f0 100%)', accent: '#8B7EC8' },
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl py-7 transition active:scale-[0.97] sm:py-9"
              style={{
                background: item.bg,
                boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                border: `2px solid ${item.accent}30`,
              }}
            >
              <span className="text-xl font-bold sm:text-2xl" style={{ color: item.accent }}>
                {item.label}
              </span>
              <span className="text-sm text-gray-500 sm:text-base">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </DidV2Layout>
  );
}
