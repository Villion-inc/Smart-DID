import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getVideoStatus, requestVideo, getDidBookDetail } from '../../api/did.api';

type VideoState = 'loading' | 'generating' | 'ready' | 'playing' | 'error';

/** 프로토타입: 실제 영상 로드 실패 시 사용할 샘플 영상 URL */
const env = (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string> }).env) || {};
const FALLBACK_VIDEO_URL =
  env.VITE_PROTOTYPE_FALLBACK_VIDEO ||
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

/**
 * DidVideoPlayer - 영상 보기 페이지
 * 1920x1200 키오스크 화면에 최적화
 */
export const DidVideoPlayer = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [videoState, setVideoState] = useState<VideoState>('loading');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  /** 프로토타입: API 영상 로드 실패 시 fallback 샘플 재생 */
  const [useFallbackVideo, setUseFallbackVideo] = useState(false);
  const [bookTitle, setBookTitle] = useState('도서 정보 로딩 중...');
  const [queuePosition, setQueuePosition] = useState<number | undefined>();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  /** API 서버 기준 영상 URL (상대 경로면 /api 포함한 base 사용 — GET /api/videos/:filename) */
  const apiBase = env.VITE_API_URL || 'http://localhost:3000/api';
  const resolvedApiVideoUrl =
    videoUrl?.startsWith('http')
      ? videoUrl
      : videoUrl
        ? `${apiBase.replace(/\/?$/, '')}${videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`}`
        : null;
  /** 재생할 최종 URL (프로토타입 fallback 적용) */
  const fullVideoUrl = useFallbackVideo ? FALLBACK_VIDEO_URL : resolvedApiVideoUrl;

  // 영상 상태 폴링
  const pollVideoStatus = useCallback(async () => {
    if (!bookId) return;

    try {
      const status = await getVideoStatus(bookId);
      
      switch (status.status) {
        case 'READY':
          setVideoUrl(status.videoUrl);
          setVideoState('ready');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          break;
        case 'GENERATING':
          setVideoState('generating');
          setQueuePosition(undefined);
          break;
        case 'QUEUED':
          setVideoState('generating');
          setQueuePosition(status.queuePosition);
          break;
        case 'FAILED':
          setVideoState('error');
          setErrorMessage(status.message || '영상 생성에 실패했습니다');
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          break;
        case 'NONE':
          // 영상이 없으면 생성 요청
          await requestVideo(bookId);
          setVideoState('generating');
          break;
      }
    } catch (error) {
      console.error('Failed to poll video status:', error);
    }
  }, [bookId]);

  // bookId 바뀌면 fallback 초기화
  useEffect(() => {
    setUseFallbackVideo(false);
  }, [bookId]);

  useEffect(() => {
    const initVideo = async () => {
      if (!bookId) return;

      // 도서 정보 가져오기
      try {
        const bookDetail = await getDidBookDetail(bookId);
        if (bookDetail) {
          setBookTitle(bookDetail.title);
        }
      } catch (e) {
        console.error('Failed to fetch book detail:', e);
      }

      // 영상 상태 확인 및 요청
      try {
        const status = await getVideoStatus(bookId);
        
        if (status.status === 'READY' && status.videoUrl) {
          setVideoUrl(status.videoUrl);
          setVideoState('ready');
        } else if (status.status === 'NONE' || status.status === 'FAILED') {
          // 영상 생성 요청
          await requestVideo(bookId);
          setVideoState('generating');
          // 폴링 시작
          pollingRef.current = setInterval(pollVideoStatus, 3000);
        } else {
          // QUEUED 또는 GENERATING
          setVideoState('generating');
          setQueuePosition(status.queuePosition);
          pollingRef.current = setInterval(pollVideoStatus, 3000);
        }
      } catch (error) {
        console.error('Failed to init video:', error);
        setVideoState('error');
        setErrorMessage('영상 정보를 불러올 수 없습니다');
      }
    };

    initVideo();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [bookId, pollVideoStatus]);

  // 영상 재생
  const handlePlay = () => {
    if (videoRef.current && videoUrl) {
      videoRef.current.play();
      setVideoState('playing');
    }
  };

  useEffect(() => {
    if (videoState === 'ready' && videoRef.current) {
      handlePlay();
    }
  }, [videoState]);

  // 프로토타입: 실패(error)일 때만 fallback 샘플 표시. 생성 중(generating)에는 로딩 UI만 표시
  useEffect(() => {
    if (videoState !== 'error') return;
    if (videoUrl) return;
    const t = setTimeout(() => setUseFallbackVideo(true), 2000);
    return () => clearTimeout(t);
  }, [videoState, videoUrl]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleCheckLocation = () => {
    navigate(`/did/location/${bookId}`);
  };

  const handleRestart = () => {
    navigate('/did');
  };

  return (
    <div className="relative w-[1920px] h-[1200px] bg-white mx-auto overflow-hidden">
      {/* Header Box - left:99px, top:63px */}
      <div 
        className="absolute left-[99px] top-[63px] w-[655px] h-[105px]
                   border border-black rounded-[60px] flex items-center justify-center gap-4"
        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
      >
        <img src="/genta-logo.png" alt="GenTA" className="h-[60px] w-auto" />
        <span className="text-[48px] font-bold text-black">영상보기</span>
      </div>

      {/* Back Button */}
      <button
        onClick={handleBack}
        className="absolute left-[1614px] top-[86px] text-[30px] text-black hover:text-gray-600"
      >
        ← 이전 단계로
      </button>

      {/* Video Area - top:265px */}
      <div className="absolute left-[211px] top-[265px] w-[1445px] h-[670px] bg-[#D9D9D9] rounded-[40px] flex flex-col items-center justify-center overflow-hidden">
        {fullVideoUrl && (videoState === 'ready' || videoState === 'playing') && !useFallbackVideo ? (
          // 실제 비디오 플레이어 (로드 실패 시 onError → useFallbackVideo)
          <video
            ref={videoRef}
            src={resolvedApiVideoUrl || fullVideoUrl}
            className="w-full h-full object-contain rounded-[40px]"
            controls
            autoPlay
            onEnded={() => setVideoState('ready')}
            onError={() => {
              if (!useFallbackVideo) setUseFallbackVideo(true);
            }}
          />
        ) : useFallbackVideo ? (
          // 실패 후 fallback 샘플 (프로토타입)
          <video
            ref={videoRef}
            src={FALLBACK_VIDEO_URL}
            className="w-full h-full object-contain rounded-[40px]"
            controls
            autoPlay
          />
        ) : (
          // 로딩/생성 중 UI (로딩바 + 메시지)
          <>
            <h2 className="text-[40px] font-bold text-black text-center leading-[48px] mb-6">
              {bookTitle}<br />8초 미리보기 영상
            </h2>

            {/* 로딩바 */}
            <div className="w-full max-w-[600px] h-[24px] bg-[#E5E5E5] rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-[#4A90D9] rounded-full animate-pulse transition-all duration-500"
                style={{ width: videoState === 'generating' ? '75%' : '35%' }}
              />
            </div>

            <div className="w-[320px] min-h-[80px] bg-[#F3F3F3] border border-black rounded-[40px] flex items-center justify-center px-6">
              <span className="text-[28px] text-black text-center">
                {videoState === 'loading' && '로딩 중...'}
                {videoState === 'generating' && (
                  queuePosition != null
                    ? `대기 중 (${queuePosition}번째)`
                    : '영상 생성 중... 잠시만 기다려 주세요.'
                )}
                {videoState === 'error' && '오류 발생'}
              </span>
            </div>

            {videoState === 'generating' && (
              <div className="mt-8 flex flex-col items-center">
                <div className="w-20 h-20 border-4 border-[#4A90D9] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-[24px] text-gray-700">AI가 영상을 만들고 있어요...</p>
              </div>
            )}

            {videoState === 'error' && (
              <p className="mt-4 text-xl text-red-600 max-w-md text-center">{errorMessage}</p>
            )}
          </>
        )}
      </div>

      {/* Bottom Buttons */}
      {/* 도서위치 확인 Button - left:211px, top:953px */}
      <button
        onClick={handleCheckLocation}
        className="absolute left-[211px] top-[953px] w-[1111px] h-[111px]
                   bg-[#D9D9D9] rounded-[40px] shadow-md
                   flex items-center justify-center gap-4
                   hover:bg-gray-400 transition-all"
      >
        <svg className="w-[48px] h-[48px]" fill="none" stroke="#1E1E1E" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" 
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" 
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-[40px] font-bold text-black">도서위치 확인</span>
      </button>

      {/* 다시 시작 Button - left:1352px, top:953px */}
      <button
        onClick={handleRestart}
        className="absolute left-[1352px] top-[953px] w-[304px] h-[111px]
                   bg-[#D9D9D9] rounded-[40px] shadow-md
                   flex items-center justify-center gap-3
                   hover:bg-gray-400 transition-all"
      >
        <svg className="w-[48px] h-[48px]" fill="none" stroke="#1E1E1E" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-[40px] font-bold text-black">다시 시작</span>
      </button>
    </div>
  );
};
