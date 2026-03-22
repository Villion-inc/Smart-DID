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

  return (
    <DidV2Layout title="위치 안내">
      <div className="flex flex-col items-center px-4 py-6">
        <p className="mb-6 text-center text-2xl font-bold text-gray-800 sm:mb-8 sm:text-3xl">
          📍 이 책은 여기 있어요!
        </p>

        {/* Book Info Card */}
        <div
          className="mb-6 w-full max-w-lg rounded-3xl p-6 sm:mb-8 sm:p-8"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <div className="flex items-start gap-5 sm:gap-6">
            {/* Cover Image */}
            <div
              className="h-36 w-24 shrink-0 rounded-xl sm:h-44 sm:w-32"
              style={{
                background: bookDetail?.coverImageUrl
                  ? `url(${bookDetail.coverImageUrl}) center/cover no-repeat`
                  : 'linear-gradient(180deg, #E0F0F8 0%, #C8E8D0 100%)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              {!bookDetail?.coverImageUrl && (
                <div className="flex h-full w-full items-center justify-center text-4xl sm:text-5xl">📚</div>
              )}
            </div>
            {/* Book Details */}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-gray-800 line-clamp-2 sm:text-2xl">
                {bookDetail?.title || '책 제목'}
              </h2>
              <p className="mt-2 text-base text-gray-600 sm:text-lg">{bookDetail?.author || '저자'}</p>
              <p className="mt-1 text-sm text-gray-500 sm:text-base">
                {bookDetail?.publisher}
                {bookDetail?.publishedYear ? ` · ${bookDetail.publishedYear}년` : ''}
              </p>
              {/* Availability Badge */}
              {bookDetail?.isAvailable !== undefined && (
                <span
                  className={`mt-3 inline-block rounded-full px-4 py-1.5 text-sm font-medium sm:mt-4 sm:px-5 sm:py-2 sm:text-base ${
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
        </div>

        {/* Location Details */}
        <div
          className="mb-6 w-full max-w-lg rounded-3xl p-6 sm:mb-8 sm:p-8"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <h3 className="mb-5 text-center text-xl font-semibold text-gray-800 sm:mb-6 sm:text-2xl">
            📚 도서 위치 정보
          </h3>
          <div className="flex flex-col gap-4 sm:gap-5">
            {bookDetail?.shelfCode && (
              <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-5 py-4 sm:px-6 sm:py-5">
                <span className="text-base text-gray-600 sm:text-lg">서가 위치</span>
                <span className="text-xl font-bold text-blue-700 sm:text-2xl">{bookDetail.shelfCode}</span>
              </div>
            )}
            {bookDetail?.callNumber && (
              <div className="flex items-center justify-between rounded-2xl bg-green-50 px-5 py-4 sm:px-6 sm:py-5">
                <span className="text-base text-gray-600 sm:text-lg">청구기호</span>
                <span className="text-xl font-bold text-green-700 sm:text-2xl">{bookDetail.callNumber}</span>
              </div>
            )}
            {bookDetail?.isbn && (
              <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 sm:px-6 sm:py-5">
                <span className="text-base text-gray-600 sm:text-lg">ISBN</span>
                <span className="text-base font-medium text-gray-700 sm:text-lg">{bookDetail.isbn}</span>
              </div>
            )}
            {!bookDetail?.shelfCode && !bookDetail?.callNumber && (
              <p className="py-6 text-center text-lg text-gray-500 sm:text-xl">
                위치 정보를 불러오는 중입니다...
              </p>
            )}
          </div>
        </div>

        {/* Back button */}
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
