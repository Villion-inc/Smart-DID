import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getDidBookDetail,
  getVideoStatus,
  requestVideo,
} from '../../api/did.api';
import { DidV2Layout } from './DidV2Layout';

// 영상 URL: /api/videos/xxx 형태면 상대경로로 두어 Vite 프록시(localhost:5173 → 3000)로 재생, 그 외엔 apiOrigin 사용
const _env = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env : undefined;
const apiUrl = (_env && typeof _env.VITE_API_URL === 'string' ? _env.VITE_API_URL : undefined) || 'http://localhost:3000/api';
const apiOrigin = apiUrl.replace(/\/api\/?$/, '') || 'http://localhost:3000';

/**
 * Frame 14 - 책 미리보기: 영상 재생, 줄거리, 태그, 읽어볼래요, 위치 안내
 */
export function DidV2BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<'NONE' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED'>('NONE');
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [shelfCode, setShelfCode] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** NONE일 때 영상 생성 요청은 한 번만 보냄 */
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!bookId) return;
    (async () => {
      const detail = await getDidBookDetail(bookId);
      if (detail) {
        setTitle(detail.title);
        setSummary(detail.summary || '');
        setShelfCode(detail.shelfCode || '');
        setTags(
          [detail.category].filter(Boolean).length > 0
            ? [detail.category]
            : ['추리', '모험', '팀워크']
        );
      }
    })();
  }, [bookId]);

  useEffect(() => {
    if (!bookId) return;
    requestedRef.current = false;
    setRequestMessage(null);
    setSubtitleUrl(null);

    const poll = async () => {
      try {
        const res = await getVideoStatus(bookId);
        setVideoStatus(res.status);
        if (res.status === 'READY') {
          if (res.videoUrl) setVideoUrl(res.videoUrl);
          setSubtitleUrl(res.subtitleUrl ?? null);
        } else {
          setSubtitleUrl(null);
        }

        if (res.status === 'NONE' && !requestedRef.current) {
          requestedRef.current = true;
          try {
            const reqRes = await requestVideo(bookId);
            setVideoStatus(reqRes.status);
            setRequestMessage(reqRes.message || '영상 생성 요청을 보냈어요.');
            if (reqRes.status === 'READY') {
              if (reqRes.videoUrl) setVideoUrl(reqRes.videoUrl);
              setSubtitleUrl(reqRes.subtitleUrl ?? null);
            }
          } catch (err) {
            requestedRef.current = false;
            setRequestMessage('영상 요청 실패. 잠시 후 다시 시도해주세요.');
          }
        }
      } catch (e) {
        console.error('DidV2BookDetail poll error:', e);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [bookId]);

  // 상대 경로(/api/...)면 그대로 사용 → 같은 origin(5173)에서 요청되어 Vite 프록시로 3000 전달, 영상 재생 안정
  const resolvedVideoUrl = videoUrl?.startsWith('http')
    ? videoUrl
    : videoUrl?.startsWith('/')
      ? videoUrl
      : videoUrl
        ? `${apiOrigin}${videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`}`
        : null;
  const resolvedSubtitleUrl = subtitleUrl?.startsWith('http')
    ? subtitleUrl
    : subtitleUrl?.startsWith('/')
      ? subtitleUrl
      : subtitleUrl
        ? `${apiOrigin}${subtitleUrl.startsWith('/') ? subtitleUrl : `/${subtitleUrl}`}`
        : null;

  return (
    <DidV2Layout title="책 미리보기">
      <div className="px-4 py-3" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <div className="mb-4 w-full max-w-full overflow-hidden rounded-2xl bg-[#D9D9D9] shadow" style={{ boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' }}>
          <div className="relative h-44 w-full bg-black">
            {resolvedVideoUrl && videoStatus === 'READY' ? (
              <video
                ref={videoRef}
                src={resolvedVideoUrl}
                controls
                className="h-full w-full object-contain"
                playsInline
              >
                {resolvedSubtitleUrl && (
                  <track
                    default
                    kind="subtitles"
                    src={resolvedSubtitleUrl}
                    srcLang="ko"
                    label="한국어"
                  />
                )}
              </video>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white">
                {videoStatus === 'QUEUED' || videoStatus === 'GENERATING' ? (
                  <>
                    <span className="text-sm">영상 생성 중...</span>
                    {requestMessage && <span className="text-xs text-white/80">{requestMessage}</span>}
                  </>
                ) : videoStatus === 'NONE' && requestMessage ? (
                  <span className="text-xs text-white/80">{requestMessage}</span>
                ) : (
                  <span className="text-base">영상재생</span>
                )}
              </div>
            )}
          </div>
          <div className="p-3 text-center">
            <p className="text-sm font-normal leading-snug text-black line-clamp-4">
              {summary || '책 제목 줄거리'}
            </p>
          </div>
        </div>

        <p className="mb-2 text-base font-normal leading-snug text-black">
          이 책은 이런 느낌!
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="flex h-9 min-w-[4rem] items-center justify-center rounded-full bg-[#D9D9D9] px-3 text-sm font-normal text-black"
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/did/location/${bookId}`)}
          className="mb-3 flex h-11 w-full items-center justify-center rounded-xl bg-[#D9D9D9] text-sm font-bold shadow"
          style={{ boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' }}
        >
          📒 읽어볼래요!
        </button>
        <button
          type="button"
          onClick={() => navigate(`/did/location/${bookId}`)}
          className="flex h-10 w-full items-center justify-center rounded-xl bg-[#D9D9D9] text-xs font-normal shadow"
          style={{ boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' }}
        >
          위치 안내 {shelfCode ? `(${shelfCode})` : ''}
        </button>
      </div>
    </DidV2Layout>
  );
}
