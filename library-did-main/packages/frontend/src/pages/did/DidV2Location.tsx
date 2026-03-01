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
      <div className="flex flex-1 flex-col py-4">
        <p className="mb-4 text-center text-xl font-bold text-gray-800 sm:text-2xl">
          📍 이 책은 여기 있어요!
        </p>

        {/* Book Info Card */}
        <div
          className="mb-4 w-full rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <div className="flex items-start gap-4">
            {/* Cover Image */}
            <div
              className="h-28 w-20 shrink-0 rounded-lg sm:h-32 sm:w-24"
              style={{
                background: bookDetail?.coverImageUrl
                  ? `url(${bookDetail.coverImageUrl}) center/cover no-repeat`
                  : 'linear-gradient(180deg, #E0F0F8 0%, #C8E8D0 100%)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              {!bookDetail?.coverImageUrl && (
                <div className="flex h-full w-full items-center justify-center text-3xl">📚</div>
              )}
            </div>
            {/* Book Details */}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-gray-800 line-clamp-2 sm:text-lg">
                {bookDetail?.title || '책 제목'}
              </h2>
              <p className="mt-1 text-sm text-gray-600 sm:text-base">{bookDetail?.author || '저자'}</p>
              <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
                {bookDetail?.publisher}
                {bookDetail?.publishedYear ? ` · ${bookDetail.publishedYear}년` : ''}
              </p>
              {/* Availability Badge */}
              {bookDetail?.isAvailable !== undefined && (
                <span
                  className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium sm:text-sm ${
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
          className="w-full rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <h3 className="mb-3 text-center text-base font-semibold text-gray-800 sm:text-lg">
            📚 도서 위치 정보
          </h3>
          <div className="flex flex-col gap-3">
            {bookDetail?.shelfCode && (
              <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
                <span className="text-sm text-gray-600 sm:text-base">서가 위치</span>
                <span className="text-base font-bold text-blue-700 sm:text-lg">{bookDetail.shelfCode}</span>
              </div>
            )}
            {bookDetail?.callNumber && (
              <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
                <span className="text-sm text-gray-600 sm:text-base">청구기호</span>
                <span className="text-base font-bold text-green-700 sm:text-lg">{bookDetail.callNumber}</span>
              </div>
            )}
            {bookDetail?.isbn && (
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-600 sm:text-base">ISBN</span>
                <span className="text-sm font-medium text-gray-700 sm:text-base">{bookDetail.isbn}</span>
              </div>
            )}
            {!bookDetail?.shelfCode && !bookDetail?.callNumber && (
              <p className="py-4 text-center text-base text-gray-500">
                위치 정보를 불러오는 중입니다...
              </p>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="min-h-4 flex-1" />

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-12 w-full shrink-0 items-center justify-center rounded-2xl text-base font-semibold text-gray-700 transition active:scale-[0.98] sm:h-14 sm:text-lg"
          style={{ background: 'rgba(255,255,255,0.8)' }}
        >
          ← 돌아가기
        </button>
      </div>
    </DidV2Layout>
  );
}
