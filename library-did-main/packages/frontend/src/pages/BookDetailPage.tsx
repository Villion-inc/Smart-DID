import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book, type VideoStatus } from '../types';
import { bookApi } from '../api/book.api';

export function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>('NONE');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bookId) {
      loadBookAndVideo();
    }
  }, [bookId]);

  const loadBookAndVideo = async () => {
    if (!bookId) return;

    try {
      const [bookData, videoData] = await Promise.all([
        bookApi.getBookDetail(bookId),
        bookApi.getVideoStatus(bookId),
      ]);

      setBook(bookData);
      setVideoStatus(videoData.status);
      setVideoUrl(videoData.videoUrl || null);
    } catch (error) {
      console.error('Failed to load book:', error);
    }
  };

  const handleRequestVideo = async () => {
    if (!bookId) return;

    setLoading(true);
    try {
      const result = await bookApi.requestVideo(bookId);
      setVideoStatus(result.status);
      alert(result.message ?? '영상 요청이 접수되었습니다.');

      if (result.status !== 'READY') {
        setTimeout(loadBookAndVideo, 3000);
      }
    } catch (error) {
      console.error('Failed to request video:', error);
      alert('비디오 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!book) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/')}
        style={{
          marginBottom: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#ddd',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        ← 검색으로 돌아가기
      </button>

      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{book.title}</h1>
      <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1rem' }}>저자: {book.author}</p>
      <p style={{ color: '#888', marginBottom: '0.5rem' }}>장르: {book.category}</p>
      <p style={{ color: '#888', marginBottom: '2rem' }}>서가: {book.shelfCode}</p>

      <div style={{ backgroundColor: '#f5f5f5', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>책 소개</h3>
        <p style={{ lineHeight: '1.6' }}>{book.summary}</p>
      </div>

      <div style={{ border: '2px solid #4CAF50', borderRadius: '8px', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>영상 요약</h3>

        {videoStatus === 'READY' && videoUrl && (
          <div>
            <video
              controls
              style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }}
              src={videoUrl}
            >
              브라우저가 비디오를 지원하지 않습니다.
            </video>
            <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>영상이 준비되었습니다!</p>
          </div>
        )}

        {videoStatus === 'NONE' && (
          <div>
            <p style={{ marginBottom: '1rem' }}>이 책의 영상 요약이 아직 없습니다.</p>
            <button
              onClick={handleRequestVideo}
              disabled={loading}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              {loading ? '요청 중...' : '영상 생성 요청'}
            </button>
          </div>
        )}

        {videoStatus === 'QUEUED' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p style={{ color: '#FF9800' }}>영상 생성 대기 중...</p>
          </div>
        )}

        {videoStatus === 'GENERATING' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎬</div>
            <p style={{ color: '#2196F3' }}>영상 생성 중...</p>
          </div>
        )}

        {videoStatus === 'FAILED' && (
          <div>
            <p style={{ color: '#f44336', marginBottom: '1rem' }}>영상 생성에 실패했습니다.</p>
            <button
              onClick={handleRequestVideo}
              disabled={loading}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
