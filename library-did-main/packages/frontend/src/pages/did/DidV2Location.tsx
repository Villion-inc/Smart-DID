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
      <div className="flex flex-1 flex-col" style={{ padding: '40px 0' }}>
        <p className="text-center font-bold text-gray-800" style={{ fontSize: 48, marginBottom: 40 }}>
          📍 이 책은 여기 있어요!
        </p>

        {/* Book Info Card */}
        <div
          className="w-full"
          style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 36, marginBottom: 32 }}
        >
          <div className="flex items-start" style={{ gap: 32 }}>
            {/* Cover Image */}
            <div
              className="shrink-0"
              style={{
                width: 160,
                height: 220,
                borderRadius: 16,
                background: bookDetail?.coverImageUrl
                  ? `url(${bookDetail.coverImageUrl}) center/cover no-repeat`
                  : 'linear-gradient(180deg, #E0F0F8 0%, #C8E8D0 100%)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}
            >
              {!bookDetail?.coverImageUrl && (
                <div className="flex h-full w-full items-center justify-center" style={{ fontSize: 56 }}>
                  📚
                </div>
              )}
            </div>
            {/* Book Details */}
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-gray-800 line-clamp-2" style={{ fontSize: 40 }}>
                {bookDetail?.title || '책 제목'}
              </h2>
              <p className="text-gray-600" style={{ fontSize: 32, marginTop: 12 }}>{bookDetail?.author || '저자'}</p>
              <p className="text-gray-500" style={{ fontSize: 26, marginTop: 8 }}>
                {bookDetail?.publisher}
                {bookDetail?.publishedYear ? ` · ${bookDetail.publishedYear}년` : ''}
              </p>
              {/* Availability Badge */}
              {bookDetail?.isAvailable !== undefined && (
                <span
                  className={`inline-block font-medium ${
                    bookDetail.isAvailable
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                  style={{ fontSize: 28, padding: '12px 24px', borderRadius: 20, marginTop: 20 }}
                >
                  {bookDetail.isAvailable ? '✓ 대출가능' : '✗ 대출중'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Location Details */}
        <div
          className="w-full"
          style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 24, padding: 36 }}
        >
          <h3 className="text-center font-semibold text-gray-800" style={{ fontSize: 36, marginBottom: 28 }}>
            📚 도서 위치 정보
          </h3>
          <div className="flex flex-col" style={{ gap: 24 }}>
            {bookDetail?.shelfCode && (
              <div className="flex items-center justify-between bg-blue-50" style={{ borderRadius: 20, padding: '24px 32px' }}>
                <span className="text-gray-600" style={{ fontSize: 30 }}>서가 위치</span>
                <span className="font-bold text-blue-700" style={{ fontSize: 36 }}>{bookDetail.shelfCode}</span>
              </div>
            )}
            {bookDetail?.callNumber && (
              <div className="flex items-center justify-between bg-green-50" style={{ borderRadius: 20, padding: '24px 32px' }}>
                <span className="text-gray-600" style={{ fontSize: 30 }}>청구기호</span>
                <span className="font-bold text-green-700" style={{ fontSize: 36 }}>{bookDetail.callNumber}</span>
              </div>
            )}
            {bookDetail?.isbn && (
              <div className="flex items-center justify-between bg-gray-50" style={{ borderRadius: 20, padding: '24px 32px' }}>
                <span className="text-gray-600" style={{ fontSize: 30 }}>ISBN</span>
                <span className="font-medium text-gray-700" style={{ fontSize: 30 }}>{bookDetail.isbn}</span>
              </div>
            )}
            {!bookDetail?.shelfCode && !bookDetail?.callNumber && (
              <p className="text-center text-gray-500" style={{ fontSize: 32, padding: '40px 0' }}>
                위치 정보를 불러오는 중입니다...
              </p>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" style={{ minHeight: 40 }} />

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex w-full shrink-0 items-center justify-center font-semibold text-gray-700 transition active:scale-[0.98]"
          style={{ height: 88, borderRadius: 24, fontSize: 36, background: 'rgba(255,255,255,0.8)' }}
        >
          ← 돌아가기
        </button>
      </div>
    </DidV2Layout>
  );
}
