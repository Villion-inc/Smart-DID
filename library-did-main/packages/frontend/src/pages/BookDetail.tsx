import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '../stores/bookStore';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { VideoStatusBadge } from '../components/VideoStatusBadge';
import { Loading } from '../components/Loading';
import { ArrowLeft, Play, Clock, AlertCircle } from 'lucide-react';

export const BookDetail: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const {
    currentBook,
    videoStatus,
    isLoading,
    error,
    getBookDetail,
    getVideoStatus,
    requestVideo,
    clearCurrentBook,
  } = useBookStore();

  useEffect(() => {
    if (bookId) {
      getBookDetail(bookId);
      getVideoStatus(bookId);
    }

    return () => clearCurrentBook();
  }, [bookId]);

  const handleRequestVideo = async () => {
    if (bookId) {
      await requestVideo(bookId);
    }
  };

  if (isLoading && !currentBook) {
    return <Loading text="도서 정보를 불러오는 중..." />;
  }

  if (!currentBook) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">도서를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            검색으로 돌아가기
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Book Info Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-6 mb-6">
            {/* Cover */}
            <img
              src={currentBook.coverImageUrl || 'https://via.placeholder.com/200x280?text=No+Cover'}
              alt={currentBook.title}
              className="w-48 h-64 object-cover rounded-lg shadow-md"
            />

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{currentBook.title}</h1>
                {currentBook.isAvailable ? (
                  <Badge variant="success">대출 가능</Badge>
                ) : (
                  <Badge variant="warning">대출중</Badge>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-lg text-gray-700">
                  <span className="font-medium">저자:</span> {currentBook.author}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">출판사:</span> {currentBook.publisher} ({currentBook.publishedYear})
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">ISBN:</span> {currentBook.isbn}
                </p>
              </div>

              <div className="flex gap-2 mb-4">
                <Badge variant="info">{currentBook.category}</Badge>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                <p><span className="font-medium">청구기호:</span> {currentBook.callNumber}</p>
                <p><span className="font-medium">등록번호:</span> {currentBook.registrationNumber}</p>
                <p><span className="font-medium">서가 위치:</span> {currentBook.shelfCode}</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">책 소개</h2>
            <p className="text-gray-700 leading-relaxed">{currentBook.summary}</p>
          </div>
        </div>

        {/* Video Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">AI 영상 요약</h2>
            {videoStatus && <VideoStatusBadge status={videoStatus.status} />}
          </div>

          {!videoStatus || videoStatus.status === 'NONE' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 mb-4">이 책의 영상 요약이 아직 없습니다.</p>
              <Button onClick={handleRequestVideo} isLoading={isLoading}>
                영상 생성 요청
              </Button>
            </div>
          ) : videoStatus.status === 'QUEUED' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <p className="text-gray-700 font-medium mb-2">영상 생성 대기중</p>
              <p className="text-sm text-gray-500">
                요청 횟수: {videoStatus.requestCount}회
              </p>
            </div>
          ) : videoStatus.status === 'GENERATING' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="animate-spin h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium mb-2">영상 생성중</p>
              <p className="text-sm text-gray-500">잠시만 기다려주세요...</p>
            </div>
          ) : videoStatus.status === 'READY' ? (
            <div>
              {videoStatus.videoUrl ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    controls
                    className="w-full h-full"
                    src={videoStatus.videoUrl}
                  >
                    브라우저가 비디오를 지원하지 않습니다.
                  </video>
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <p className="text-gray-500">영상 URL이 없습니다</p>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>조회수: {videoStatus.requestCount}회</span>
                {videoStatus.expiresAt && (
                  <span>만료일: {new Date(videoStatus.expiresAt).toLocaleDateString('ko-KR')}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-gray-700 font-medium mb-4">영상 생성에 실패했습니다</p>
              <Button variant="danger" onClick={handleRequestVideo} isLoading={isLoading}>
                다시 시도
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
