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
  const [detail, setDetail] = useState<{
    title: string;
    author: string;
    publisher: string;
    publishedYear: number;
    summary: string;
    shelfCode: string;
    category: string;
    coverImageUrl?: string;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState<'NONE' | 'QUEUED' | 'GENERATING' | 'READY' | 'FAILED'>('NONE');
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** NONE일 때 영상 생성 요청은 한 번만 보냄 */
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!bookId) return;
    setDetailLoading(true);
    (async () => {
      const res = await getDidBookDetail(bookId);
      if (res) {
        setDetail({
          title: res.title,
          author: res.author || '',
          publisher: res.publisher || '',
          publishedYear: res.publishedYear || 0,
          summary: res.summary || '',
          shelfCode: res.shelfCode || '',
          category: res.category || '',
          coverImageUrl: res.coverImageUrl,
        });
        setTags(
          [res.category].filter(Boolean).length > 0
            ? [res.category]
            : ['추리', '모험', '팀워크']
        );
      } else {
        setDetail(null);
      }
      setDetailLoading(false);
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

        // 책 정보 확인 단계에서는 자동 영상 생성 요청 비활성화 (나중에 true로 변경)
        const SKIP_AUTO_VIDEO_REQUEST = true;
        if (!SKIP_AUTO_VIDEO_REQUEST && res.status === 'NONE' && !requestedRef.current) {
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

  // 도서 정보 로딩 중
  if (detailLoading) {
    return (
      <DidV2Layout title="책 미리보기">
        <div className="flex w-full max-w-[480px] flex-1 flex-col items-center justify-center px-4 py-8">
          <p className="text-base text-gray-600">도서 정보를 불러오는 중...</p>
        </div>
      </DidV2Layout>
    );
  }

  // 도서 없음 (조회 실패)
  if (!detail) {
    return (
      <DidV2Layout title="책 미리보기">
        <div className="flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
          <p className="text-center text-base text-gray-700">도서를 찾을 수 없습니다.</p>
          <button
            type="button"
            onClick={() => navigate('/did/search')}
            className="rounded-2xl bg-[#D9D9D9] px-6 py-3 text-base font-bold text-gray-800"
          >
            검색으로 돌아가기
          </button>
        </div>
      </DidV2Layout>
    );
  }

  const { title, author, publisher, publishedYear, summary, shelfCode, coverImageUrl } = detail;

  return (
    <DidV2Layout title={title || '책 미리보기'}>
      <div
        className="flex w-full max-w-[480px] flex-1 flex-col items-center px-4 py-4"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {/* 표지 + 제목/저자/출판사 */}
        <div className="mb-4 flex w-full max-w-[420px] gap-4">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt=""
              className="h-32 w-24 shrink-0 rounded-lg object-cover shadow"
            />
          ) : (
            <div
              className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-3xl"
              aria-hidden
            >
              📖
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h1 className="text-lg font-bold leading-tight text-gray-900">{title}</h1>
            {author && <p className="mt-1 text-sm text-gray-600">{author}</p>}
            {(publisher || publishedYear) && (
              <p className="mt-0.5 text-xs text-gray-500">
                {[publisher, publishedYear ? `${publishedYear}년` : ''].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        <div
          className="mb-5 w-full max-w-full overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(180deg, rgba(184, 230, 245, 0.9) 0%, rgba(168, 216, 234, 0.8) 100%)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(255,255,255,0.5) inset',
          }}
        >
          <div className="relative h-56 w-full bg-black">
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
          <div className="p-4 text-center">
            <p className="text-base font-normal leading-snug text-gray-800 line-clamp-5">
              {summary || '줄거리 없음'}
            </p>
          </div>
        </div>

        <p className="mb-3 w-full text-center text-lg font-normal leading-snug text-gray-800">
          이 책은 이런 느낌!
        </p>
        <div className="mb-5 flex flex-wrap justify-center gap-3">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="flex h-11 min-w-[5rem] items-center justify-center rounded-full px-4 text-base font-medium text-gray-800"
              style={{ background: 'rgba(255,255,255,0.6)' }}
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/did/location/${bookId}`)}
          className="mb-4 flex h-14 w-full max-w-[420px] items-center justify-center rounded-3xl text-lg font-bold text-gray-800 transition active:scale-[0.98]"
          style={{
            background: 'linear-gradient(180deg, rgba(184, 230, 245, 0.85) 0%, rgba(168, 216, 234, 0.75) 100%)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(255,255,255,0.5) inset',
          }}
        >
          📒 읽어볼래요!
        </button>
        <button
          type="button"
          onClick={() => navigate(`/did/location/${bookId}`)}
          className="flex h-12 w-full max-w-[420px] items-center justify-center rounded-3xl text-base font-semibold text-gray-800 transition active:scale-[0.98]"
          style={{
            background: 'linear-gradient(180deg, rgba(184, 230, 245, 0.85) 0%, rgba(168, 216, 234, 0.75) 100%)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(255,255,255,0.5) inset',
          }}
        >
          위치 안내{shelfCode ? ` (${shelfCode})` : ''}
        </button>
      </div>
    </DidV2Layout>
  );
}
