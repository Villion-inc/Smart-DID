import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDidBookDetail } from '../../api/did.api';
import { DidV2Layout } from './DidV2Layout';
import type { DidBookDetail } from '../../types';

/**
 * 책 위치 안내 (키오스크 세로 화면)
 * - 표지 이미지, 책 정보, 서가 위치, 청구기호, 대출 가능 여부
 */
export function DidV2Location() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [bookDetail, setBookDetail] = useState<DidBookDetail | null>(null);

  useEffect(() => {
    if (!bookId) return;
    (async () => {
      const detail = await getDidBookDetail(bookId);
      if (detail) {
        setBookDetail(detail);
      }
    })();
  }, [bookId]);

  const locationText = bookDetail?.shelfCode || '위치 정보 없음';

  return (
    <DidV2Layout title="위치 안내">
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        {/* 메인 위치 카드 — 크고 명확하게 */}
        <div
          className="mb-6 w-full max-w-lg rounded-3xl p-8 text-center sm:mb-8 sm:p-10"
          style={{ background: 'rgba(255,255,255,0.92)' }}
        >
          <div className="mb-6 flex justify-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full sm:h-24 sm:w-24"
              style={{ background: 'linear-gradient(135deg, #E8F4FC 0%, #D4EAD6 100%)' }}
            >
              <svg className="h-10 w-10 text-blue-500 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
          </div>

          <p className="mb-2 text-base text-gray-500 sm:text-lg">이 책은 여기 있어요!</p>
          <p className="text-2xl font-bold text-gray-800 sm:text-3xl">{locationText}</p>

          {bookDetail?.callNumber && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-50 px-5 py-3 sm:px-6 sm:py-4">
              <span className="text-base text-gray-500 sm:text-lg">청구기호</span>
              <span className="text-lg font-bold text-green-700 sm:text-xl">{bookDetail.callNumber}</span>
            </div>
          )}
        </div>

        {/* 책 정보 요약 */}
        <div
          className="mb-6 flex w-full max-w-lg items-center gap-4 rounded-2xl p-5 sm:mb-8 sm:gap-5 sm:p-6"
          style={{ background: 'rgba(255,255,255,0.85)' }}
        >
          <div
            className="h-24 w-16 shrink-0 rounded-lg sm:h-28 sm:w-20"
            style={{
              background: bookDetail?.coverImageUrl
                ? `url(${bookDetail.coverImageUrl}) center/cover no-repeat`
                : 'linear-gradient(180deg, #E0F0F8 0%, #C8E8D0 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            {!bookDetail?.coverImageUrl && (
              <div className="flex h-full w-full items-center justify-center">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-800 line-clamp-2 sm:text-xl">
              {bookDetail?.title || '책 제목'}
            </h2>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">{bookDetail?.author || '저자'}</p>
            {bookDetail?.isAvailable !== undefined && (
              <span
                className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium sm:px-4 sm:py-1.5 sm:text-sm ${
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

        {/* 돌아가기 버튼 */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-14 w-full max-w-lg shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-gray-700 transition active:scale-[0.98] sm:h-16 sm:text-xl"
          style={{ background: 'rgba(255,255,255,0.8)' }}
        >
          ← 돌아가기
        </button>
      </div>
    </DidV2Layout>
  );
}
