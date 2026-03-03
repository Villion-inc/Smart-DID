import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDidBookDetail, getVideoStatus, requestVideo } from '../../api/did.api';
import { DidV2Layout } from './DidV2Layout';
import type { DidBookDetail } from '../../types';

// 백엔드 API URL (영상은 백엔드에서 서빙)
const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (basePath ? `${basePath}/api` : '/api');

/**
 * 책 미리보기 (키오스크 세로 화면)
 * - 책 정보 표시 (표지, 제목, 저자, 출판사, 줄거리 등)
 * - 영상이 있으면 자동 재생, 없으면 "영상 없음" 표시
 * - 영상 종료 시 다시보기 버튼 표시
 */
export function DidV2BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
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
    if (!bookId) return;
    (async () => {
      const detail = await getDidBookDetail(bookId);
      if (detail) {
        setBookDetail(detail);
      }
    })();
  }, [bookId]);

  // Poll video status helper
  const pollVideoStatus = useCallback(async () => {
    if (!bookId) return;
    try {
      const res = await getVideoStatus(bookId);
      setVideoStatus(res.status);
      if (res.status === 'READY' && res.videoUrl) {
        setVideoUrl(res.videoUrl);
        // Stop polling once video is ready
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
    if (!bookId || !bookDetail) return;

    const initVideo = async () => {
      try {
        const res = await getVideoStatus(bookId);
        setVideoStatus(res.status);

        if (res.status === 'READY' && res.videoUrl) {
          setVideoUrl(res.videoUrl);
          return; // Already ready, no need to request or poll
        }

        // Auto-request video if status is NONE or FAILED
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

        // Start polling for QUEUED or GENERATING
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

  // 다시보기 핸들러
  const handleReplay = () => {
    if (videoRef.current) {
      setVideoEnded(false);
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  // /videos/xxx.mp4 → /api/videos/xxx.mp4 (백엔드에서 서빙)
  const resolvedVideoUrl = videoUrl
    ? videoUrl.startsWith('http')
      ? videoUrl
      : videoUrl.startsWith('/videos/')
        ? `${API_BASE_URL}${videoUrl}`
        : `${API_BASE_URL}/videos/${videoUrl.replace(/^\//, '')}`
    : null;

  return (
    <DidV2Layout title={bookDetail?.title || '책 미리보기'}>
      <div className="flex flex-1 flex-col overflow-auto py-4 sm:py-6">
        {/* Video player */}
        <div
          className="relative w-full shrink-0 overflow-hidden rounded-3xl"
          style={{
            aspectRatio: '16/9',
            background: '#1a1a1a',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}
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
              {/* 영상 종료 시 다시보기 오버레이 */}
              {videoEnded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <button
                    type="button"
                    onClick={handleReplay}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform active:scale-90 sm:h-24 sm:w-24"
                  >
                    <svg 
                      className="h-10 w-10 translate-x-0.5 text-gray-800 sm:h-12 sm:w-12" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white">
              {videoStatus === 'QUEUED' || videoStatus === 'GENERATING' ? (
                <>
                  <span className="text-6xl">🎬</span>
                  <span className="text-lg sm:text-xl">영상 생성 중...</span>
                </>
              ) : (
                <>
                  <span className="text-6xl">📖</span>
                  <span className="text-lg sm:text-xl">영상이 아직 없어요</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Book Info Card */}
        <div
          className="mt-5 w-full shrink-0 rounded-3xl p-5 sm:mt-6 sm:p-6"
          style={{ background: 'rgba(255,255,255,0.85)' }}
        >
          {/* Title & Author */}
          <div className="mb-4 flex items-start gap-4 sm:gap-5">
            {/* Cover Image */}
            {bookDetail?.coverImageUrl && (
              <div
                className="h-32 w-22 shrink-0 rounded-xl sm:h-36 sm:w-24"
                style={{
                  background: `url(${bookDetail.coverImageUrl}) center/cover no-repeat`,
                  boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
                  width: '5.5rem',
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-gray-800 line-clamp-2 sm:text-2xl">
                {bookDetail?.title || '제목'}
              </h2>
              <p className="mt-2 text-base text-gray-600 sm:text-lg">{bookDetail?.author || '저자'}</p>
              {/* Publisher & Year */}
              <p className="mt-1 text-sm text-gray-500 sm:text-base">
                {bookDetail?.publisher}
                {bookDetail?.publishedYear ? ` · ${bookDetail.publishedYear}년` : ''}
              </p>
            </div>
          </div>

          {/* Summary */}
          <p className="text-base leading-relaxed text-gray-700 line-clamp-3 sm:text-lg">
            {bookDetail?.summary || '이 책의 줄거리를 불러오는 중입니다...'}
          </p>

          {/* Tags & Availability */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {bookDetail?.category && (
              <span
                className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 sm:px-5 sm:py-2 sm:text-base"
                style={{ background: 'rgba(107, 184, 214, 0.2)' }}
              >
                #{bookDetail.category}
              </span>
            )}
            {bookDetail?.isAvailable !== undefined && (
              <span
                className={`rounded-full px-4 py-1.5 text-sm font-medium sm:px-5 sm:py-2 sm:text-base ${
                  bookDetail.isAvailable
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {bookDetail.isAvailable ? '✓ 대출가능' : '✗ 대출중'}
              </span>
            )}
          </div>
        </div>

        {/* Location Info Preview */}
        {(bookDetail?.shelfCode || bookDetail?.callNumber) && (
          <div
            className="mt-4 w-full shrink-0 rounded-2xl p-4 sm:mt-5 sm:p-5"
            style={{ background: 'rgba(255,255,255,0.7)' }}
          >
            <div className="flex items-center justify-between text-base sm:text-lg">
              <span className="text-gray-600">📍 위치</span>
              <span className="font-semibold text-gray-800">
                {bookDetail?.shelfCode || bookDetail?.callNumber}
              </span>
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="mt-auto shrink-0 pt-4 sm:pt-5">
          <button
            type="button"
            onClick={() => navigate(`/did/location/${bookId}`)}
            className="flex h-16 w-full items-center justify-center rounded-2xl text-lg font-bold text-white transition active:scale-[0.98] sm:h-20 sm:text-xl"
            style={{
              background: 'linear-gradient(180deg, #6BB8D6 0%, #4DA3C4 100%)',
              boxShadow: '0 4px 16px rgba(77, 163, 196, 0.35)',
            }}
          >
            📖 읽어볼래요! 위치 보기
          </button>
        </div>
      </div>
    </DidV2Layout>
  );
}
