import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDidBookDetail, getVideoStatus } from '../../api/did.api';
import { DidV2Layout } from './DidV2Layout';
import type { DidBookDetail } from '../../types';

// 상대 경로 비디오/자막 URL은 현재 origin 기준으로 해석 (도메인/베이스경로 무관)
const apiOrigin =
  typeof window !== 'undefined' ? window.location.origin : '';

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

  useEffect(() => {
    if (!bookId) return;
    (async () => {
      const detail = await getDidBookDetail(bookId);
      if (detail) {
        setBookDetail(detail);
      }
    })();
  }, [bookId]);

  useEffect(() => {
    if (!bookId) return;

    const checkVideoStatus = async () => {
      try {
        const res = await getVideoStatus(bookId);
        setVideoStatus(res.status);
        if (res.status === 'READY' && res.videoUrl) {
          setVideoUrl(res.videoUrl);
        }
      } catch (e) {
        console.error('getVideoStatus error:', e);
      }
    };

    checkVideoStatus();
  }, [bookId]);

  // 영상 자동 재생
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

  const resolvedVideoUrl = videoUrl?.startsWith('http')
    ? videoUrl
    : videoUrl?.startsWith('/')
      ? videoUrl
      : videoUrl
        ? `${apiOrigin}${videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`}`
        : null;

  return (
    <DidV2Layout title={bookDetail?.title || '책 미리보기'}>
      <div className="flex flex-1 flex-col overflow-auto py-3">
        {/* Video player */}
        <div
          className="relative w-full shrink-0 overflow-hidden rounded-2xl"
          style={{
            aspectRatio: '16/9',
            background: '#1a1a1a',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform active:scale-90"
                  >
                    <svg 
                      className="h-7 w-7 translate-x-0.5 text-gray-800" 
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
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white">
              {videoStatus === 'QUEUED' || videoStatus === 'GENERATING' ? (
                <>
                  <span className="text-4xl">🎬</span>
                  <span className="text-sm sm:text-base">영상 생성 중...</span>
                </>
              ) : (
                <>
                  <span className="text-4xl">📖</span>
                  <span className="text-sm sm:text-base">영상이 아직 없어요</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Book Info Card */}
        <div
          className="mt-3 w-full shrink-0 rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.85)' }}
        >
          {/* Title & Author */}
          <div className="mb-3 flex items-start gap-3">
            {/* Cover Image */}
            {bookDetail?.coverImageUrl && (
              <div
                className="h-24 w-16 shrink-0 rounded-lg sm:h-28 sm:w-20"
                style={{
                  background: `url(${bookDetail.coverImageUrl}) center/cover no-repeat`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-gray-800 line-clamp-2 sm:text-lg">
                {bookDetail?.title || '제목'}
              </h2>
              <p className="mt-1 text-sm text-gray-600 sm:text-base">{bookDetail?.author || '저자'}</p>
              {/* Publisher & Year */}
              <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
                {bookDetail?.publisher}
                {bookDetail?.publishedYear ? ` · ${bookDetail.publishedYear}년` : ''}
              </p>
            </div>
          </div>

          {/* Summary */}
          <p className="text-sm leading-relaxed text-gray-700 line-clamp-3 sm:text-base">
            {bookDetail?.summary || '이 책의 줄거리를 불러오는 중입니다...'}
          </p>

          {/* Tags & Availability */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {bookDetail?.category && (
              <span
                className="rounded-full px-3 py-1 text-xs font-medium text-gray-700 sm:text-sm"
                style={{ background: 'rgba(107, 184, 214, 0.2)' }}
              >
                #{bookDetail.category}
              </span>
            )}
            {bookDetail?.isAvailable !== undefined && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium sm:text-sm ${
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
            className="mt-3 w-full shrink-0 rounded-2xl p-3"
            style={{ background: 'rgba(255,255,255,0.7)' }}
          >
            <div className="flex items-center justify-between text-sm sm:text-base">
              <span className="text-gray-600">📍 위치</span>
              <span className="font-medium text-gray-800">
                {bookDetail?.shelfCode || bookDetail?.callNumber}
              </span>
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="mt-auto shrink-0 pt-3">
          <button
            type="button"
            onClick={() => navigate(`/did/location/${bookId}`)}
            className="flex h-14 w-full items-center justify-center rounded-2xl text-base font-bold text-white transition active:scale-[0.98] sm:h-16 sm:text-lg"
            style={{
              background: 'linear-gradient(180deg, #6BB8D6 0%, #4DA3C4 100%)',
              boxShadow: '0 4px 12px rgba(77, 163, 196, 0.3)',
            }}
          >
            📖 읽어볼래요! 위치 보기
          </button>
        </div>
      </div>
    </DidV2Layout>
  );
}
