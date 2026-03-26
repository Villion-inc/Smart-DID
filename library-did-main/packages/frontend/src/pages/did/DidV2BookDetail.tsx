import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDidBookDetail, getVideoStatus, requestVideo } from '../../api/did.api';
import { DidV2Layout } from './DidV2Layout';
import type { DidBookDetail } from '../../types';

const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (basePath ? `${basePath}/api` : '/api');

export function DidV2BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [bookDetail, setBookDetail] = useState<DidBookDetail | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<
    'NONE' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED'
  >('NONE');
  const [videoEnded, setVideoEnded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!bookId) return;
    (async () => {
      const detail = await getDidBookDetail(bookId);
      if (detail) setBookDetail(detail);
    })();
  }, [bookId]);

  const pollVideoStatus = useCallback(async () => {
    if (!bookId) return;
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

  useEffect(() => {
    if (!bookId || !bookDetail) return;
    const initVideo = async () => {
      try {
        const res = await getVideoStatus(bookId);
        setVideoStatus(res.status);
        if (res.status === 'READY' && res.videoUrl) {
          setVideoUrl(res.videoUrl);
          return;
        }
        if (res.status === 'QUEUED' || res.status === 'GENERATING') {
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

  const handlePlay = () => {
    if (videoRef.current) {
      setIsPlaying(true);
      videoRef.current.play().catch(() => setIsPlaying(false));
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      setVideoEnded(false);
      setIsPlaying(true);
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const handleRequestVideo = async () => {
    if (!bookId || requesting) return;
    setRequesting(true);
    try {
      const res = await requestVideo(bookId, {
        title: bookDetail?.title,
        author: bookDetail?.author,
        summary: bookDetail?.summary,
      });
      setVideoStatus(res.status);
      if (!pollingRef.current) {
        pollingRef.current = setInterval(pollVideoStatus, 10_000);
      }
    } catch {
      // ignore
    } finally {
      setRequesting(false);
    }
  };

  const resolvedVideoUrl = videoUrl
    ? videoUrl.startsWith('http')
      ? videoUrl
      : videoUrl.startsWith('/videos/')
        ? `${API_BASE_URL}${videoUrl}`
        : `${API_BASE_URL}/videos/${videoUrl.replace(/^\//, '')}`
    : null;

  const showRequestButton = videoStatus === 'NONE' || videoStatus === 'FAILED';
  const isProcessing = videoStatus === 'QUEUED' || videoStatus === 'GENERATING';

  return (
    <DidV2Layout title={bookDetail?.title || '책 미리보기'}>
      <div className="flex flex-1 flex-col overflow-auto py-4 sm:py-6">
        {/* Video player */}
        <div
          className="relative w-full shrink-0 overflow-hidden"
          style={{
            aspectRatio: '16/9',
            borderRadius: '1.5rem',
            border: '4px solid rgba(255,255,255,0.7)',
            boxShadow: '0 10px 40px rgba(60,90,70,0.18), inset 0 0 0 1px rgba(255,255,255,0.3)',
            background: '#1a1a2e',
          }}
        >
          {resolvedVideoUrl && videoStatus === 'READY' ? (
            <>
              <video
                ref={videoRef}
                src={resolvedVideoUrl}
                className="h-full w-full object-contain"
                playsInline
                muted={false}
                onEnded={() => setVideoEnded(true)}
                onPlay={() => setVideoEnded(false)}
              />
              {(!isPlaying || videoEnded) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <button
                    type="button"
                    onClick={videoEnded ? handleReplay : handlePlay}
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
          ) : isProcessing ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              <span className="text-xl font-bold text-white sm:text-2xl">
                {videoStatus === 'QUEUED' ? '대기 중...' : '영상 생성 중...'}
              </span>
              <span className="text-sm text-white/60 sm:text-base">
                완료되면 자동으로 재생됩니다
              </span>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <svg className="h-10 w-10 text-white/60 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <span className="text-lg font-bold text-white/80 sm:text-xl">영상이 아직 없어요</span>
            </div>
          )}
        </div>

        {/* Book Info Card */}
        <div
          className="mt-4 w-full shrink-0 p-5 sm:mt-5 sm:p-6"
          style={{
            borderRadius: '1.2rem',
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            boxShadow: '0 2px 10px rgba(60,90,70,0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
            border: '1.5px solid rgba(255,255,255,0.6)',
          }}
        >
          <div className="mb-4 flex items-start gap-4 sm:gap-5">
            {bookDetail?.coverImageUrl && (
              <div
                className="h-32 shrink-0 rounded-xl sm:h-36"
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
              <p className="mt-1 text-sm text-gray-500 sm:text-base">
                {bookDetail?.publisher}
                {bookDetail?.publishedYear ? ` · ${bookDetail.publishedYear}년` : ''}
              </p>
            </div>
          </div>

          <p className="text-base leading-relaxed text-gray-700 line-clamp-3 sm:text-lg">
            {bookDetail?.summary || '이 책의 줄거리를 불러오는 중입니다...'}
          </p>

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

          {/* 서가 위치 / 청구기호 */}
          {(bookDetail?.shelfCode || bookDetail?.callNumber) && (
            <div className="mt-4 flex gap-3">
              {bookDetail.shelfCode && (
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-blue-50 px-4 py-3">
                  <svg className="h-4 w-4 shrink-0 text-blue-500 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 sm:text-sm">서가 위치</p>
                    <p className="text-sm font-bold text-blue-700 sm:text-base">{bookDetail.shelfCode}</p>
                  </div>
                </div>
              )}
              {bookDetail.callNumber && (
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
                  <svg className="h-4 w-4 shrink-0 text-green-500 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 sm:text-sm">청구기호</p>
                    <p className="text-sm font-bold text-green-700 sm:text-base">{bookDetail.callNumber}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons — 가로 배치 */}
        <div className="mt-auto flex shrink-0 gap-2 pt-4 sm:gap-3 sm:pt-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-14 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-gray-600 transition active:scale-[0.98] sm:h-16 sm:px-5 sm:text-base"
            style={{ background: 'rgba(255,255,255,0.7)' }}
          >
            ← 돌아가기
          </button>
          {showRequestButton && (
            <button
              type="button"
              onClick={handleRequestVideo}
              disabled={requesting}
              className="flex h-14 items-center justify-center rounded-2xl px-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50 sm:h-16 sm:px-5 sm:text-base"
              style={{
                background: 'linear-gradient(180deg, #5B9BD5 0%, #3A7BBF 100%)',
              }}
            >
              {requesting ? '요청 중...' : '영상 생성'}
            </button>
          )}
          {isProcessing && (
            <div
              className="flex h-14 items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-bold sm:h-16 sm:px-5 sm:text-base"
              style={{ background: 'rgba(102,126,234,0.15)', color: '#667eea' }}
            >
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {videoStatus === 'QUEUED' ? '대기 중' : '생성 중'}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate(`/did/location/${bookId}`)}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl text-sm font-bold text-white transition active:scale-[0.98] sm:h-16 sm:text-base"
            style={{
              background: 'linear-gradient(180deg, #6BB8D6 0%, #4DA3C4 100%)',
              boxShadow: '0 4px 16px rgba(77, 163, 196, 0.35)',
            }}
          >
            위치 보기
          </button>
        </div>
      </div>
    </DidV2Layout>
  );
}
