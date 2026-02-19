import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDidStore } from '../../stores/didStore';

/**
 * DidBookDetail
 *
 * Book detail page for DID (Digital Information Display) touch interface.
 * Shows large, readable book information with prominent shelf location.
 * Excludes video features as per DID requirements.
 */
export const DidBookDetail = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { currentBook, isLoadingDetail, error, fetchBookDetail, clearCurrentBook } = useDidStore();

  useEffect(() => {
    if (bookId) {
      fetchBookDetail(bookId);
    }

    return () => {
      clearCurrentBook();
    };
  }, [bookId]);

  const handleBack = () => {
    navigate('/did');
  };

  if (isLoadingDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-3xl text-gray-600">책 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !currentBook) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center">
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-12 text-center max-w-2xl">
          <p className="text-3xl text-red-600 font-medium mb-8">
            {error || '책 정보를 찾을 수 없습니다'}
          </p>
          <button
            onClick={handleBack}
            className="px-12 py-6 bg-blue-500 text-white text-2xl font-bold rounded-2xl
                       hover:bg-blue-600 active:scale-95 transition-all shadow-xl"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with Back Button */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-12 py-6 flex items-center gap-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-3 px-8 py-4 bg-gray-100 hover:bg-gray-200
                       rounded-2xl text-2xl font-bold transition-all active:scale-95"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            뒤로가기
          </button>
          <h1 className="text-4xl font-bold text-blue-600">책 상세정보</h1>
        </div>
      </header>

      {/* Book Detail Content */}
      <div className="container mx-auto px-12 py-16">
        <div className="grid md:grid-cols-5 gap-12">
          {/* Book Cover */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              {currentBook.coverImageUrl ? (
                <img
                  src={currentBook.coverImageUrl}
                  alt={currentBook.title}
                  className="w-full aspect-[3/4] object-cover"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <svg
                    className="w-48 h-48 text-blue-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Book Info */}
          <div className="md:col-span-3 space-y-8">
            {/* Title */}
            <div>
              <h2 className="text-5xl font-bold text-gray-900 mb-4">
                {currentBook.title}
              </h2>
              <p className="text-3xl text-gray-600">{currentBook.author}</p>
            </div>

            {/* Availability Badge */}
            <div>
              {currentBook.isAvailable ? (
                <span className="inline-block px-8 py-4 bg-green-100 text-green-700 text-2xl font-bold rounded-2xl">
                  ✓ 대출 가능
                </span>
              ) : (
                <span className="inline-block px-8 py-4 bg-red-100 text-red-700 text-2xl font-bold rounded-2xl">
                  ✗ 대출 중
                </span>
              )}
            </div>

            {/* Shelf Location - Prominently displayed */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl p-10 text-white shadow-2xl">
              <p className="text-3xl mb-4">📍 이 책은 여기 있어요!</p>
              <p className="text-6xl font-bold mb-2">{currentBook.shelfCode}</p>
              <p className="text-2xl opacity-90">청구기호: {currentBook.callNumber}</p>
            </div>

            {/* Book Details */}
            <div className="bg-white rounded-3xl p-10 shadow-xl space-y-6">
              <div>
                <p className="text-xl text-gray-500 mb-2">출판사</p>
                <p className="text-2xl text-gray-900 font-medium">{currentBook.publisher}</p>
              </div>

              <div>
                <p className="text-xl text-gray-500 mb-2">출판년도</p>
                <p className="text-2xl text-gray-900 font-medium">{currentBook.publishedYear}년</p>
              </div>

              <div>
                <p className="text-xl text-gray-500 mb-2">분류</p>
                <span className="inline-block px-6 py-3 bg-blue-100 text-blue-700 text-xl font-medium rounded-xl">
                  {currentBook.category}
                </span>
              </div>

              <div>
                <p className="text-xl text-gray-500 mb-2">ISBN</p>
                <p className="text-2xl text-gray-900 font-mono">{currentBook.isbn}</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-3xl p-10 shadow-xl">
              <h3 className="text-3xl font-bold text-gray-900 mb-6">책 소개</h3>
              <p className="text-2xl text-gray-700 leading-relaxed">
                {currentBook.summary}
              </p>
            </div>

            {/* Placeholder for future video section */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-3xl p-10">
              <div className="text-center">
                <p className="text-2xl text-purple-700 font-medium mb-4">
                  🎬 책 소개 영상
                </p>
                <p className="text-xl text-purple-600">
                  준비 중입니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-24 py-12 bg-gray-100">
        <div className="container mx-auto px-12 text-center">
          <p className="text-xl text-gray-600">
            도서 대출은 대출대에서 진행해주세요
          </p>
        </div>
      </footer>
    </div>
  );
};
