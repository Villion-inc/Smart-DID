import { useState, useEffect, useRef, useCallback } from 'react';
import { getDidBookDetail, getVideoStatus, requestVideo } from '../api/did.api';
import type { DidBookDetail } from '../types';

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (basePath ? `${basePath}/api` : '/api');

interface VideoPopupProps {
  bookId: string;
  onClose: () => void;
}

export function VideoPopup({ bookId, onClose }: VideoPopupProps) {
  const [bookDetail, setBookDetail] = useState<DidBookDetail | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<
    'NONE' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED'
  >('NONE');
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRequestedRef = useRef(false);

  // Load book detail
  useEffect(() => {
    (async () => {
      const detail = await getDidBookDetail(bookId);
      if (detail) setBookDetail(detail);
    })();
  }, [bookId]);

  // Poll video status helper
  const pollVideoStatus = useCallback(async () => {
    try {
      const res = await getVideoStatus(bookId);
      setVideoStatus(res.status);
      if (res.status === 'READY' && res.videoUrl) {
        setVideoUrl(res.videoUrl);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (e) {
      console.error('getVideoStatus error:', e);
    }
  }, [bookId]);

  // Initial video status check + auto-request + polling
  useEffect(() => {
    if (!bookDetail) return;

    const initVideo = async () => {
      try {
        const res = await getVideoStatus(bookId);
        setVideoStatus(res.status);

        if (res.status === 'READY' && res.videoUrl) {
          setVideoUrl(res.videoUrl);
          return;
        }

        if ((res.status === 'NONE' || res.status === 'FAILED') && !autoRequestedRef.current) {
          autoRequestedRef.current = true;
          try {
            const reqRes = await requestVideo(bookId, {
              title: bookDetail.title,
              author: bookDetail.author,
            });
            setVideoStatus(reqRes.status);
            if (reqRes.status === 'READY' && reqRes.videoUrl) {
              setVideoUrl(reqRes.videoUrl);
              return;
            }
          } catch (e) {
            console.error('Auto requestVideo error:', e);
          }
        }

        const currentStatus = res.status === 'NONE' || res.status === 'FAILED' ? 'QUEUED' : res.status;
        if (currentStatus === 'QUEUED' || currentStatus === 'GENERATING') {
          if (!pollingRef.current) {
            pollingRef.current = setInterval(pollVideoStatus, 10_000);
          }
        }
      } catch (e) {
        console.error('initVideo error:', e);
      }
    };

    initVideo();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [bookId, bookDetail, pollVideoStatus]);

  // Auto-play when video becomes ready
  useEffect(() => {
    if (videoRef.current && videoUrl && videoStatus === 'READY') {
      videoRef.current.play().catch((e) => {
        console.log('Autoplay blocked:', e);
      });
    }
  }, [videoUrl, videoStatus]);

  const handleReplay = () => {
    if (videoRef.current) {
      setVideoEnded(false);
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const resolvedVideoUrl = videoUrl
    ? videoUrl.startsWith('http')
      ? videoUrl
      : videoUrl.startsWith('/videos/')
        ? `${API_BASE_URL}${videoUrl}`
        : `${API_BASE_URL}/videos/${videoUrl.replace(/^\//, '')}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-[90vw] max-w-[500px] animate-[fadeScaleIn_0.25s_ease-out] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white transition active:scale-90"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Video player */}
        <div
          className="relative w-full overflow-hidden rounded-t-3xl"
          style={{ aspectRatio: '16/9', background: '#1a1a1a' }}
        >
          {resolvedVideoUrl && videoStatus === 'READY' ? (
            <>
              <video
                ref={videoRef}
                src={resolvedVideoUrl}
                className="h-full w-full object-contain"
                playsInline
                autoPlay
                muted={false}
                onEnded={() => setVideoEnded(true)}
                onPlay={() => setVideoEnded(false)}
              />
              {videoEnded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform active:scale-90"
                  >
                    <svg className="h-8 w-8 translate-x-0.5 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white">
              {videoStatus === 'QUEUED' || videoStatus === 'GENERATING' ? (
                <>
                  <span className="text-5xl">🎬</span>
                  <span className="text-base sm:text-lg">영상 생성 중...</span>
                </>
              ) : (
                <>
                  <span className="text-5xl">📖</span>
                  <span className="text-base sm:text-lg">영상이 아직 없어요</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Book info below video */}
        <div className="px-5 py-4">
          <h3 className="text-lg font-bold text-gray-800 line-clamp-1">
            {bookDetail?.title || '제목'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {bookDetail?.author || '저자'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
