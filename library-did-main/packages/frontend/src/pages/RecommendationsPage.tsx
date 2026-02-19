import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecommendationItem } from '@smart-did/shared';
import { recommendationApi } from '../api/recommendation.api';

export function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const data = await recommendationApi.getRecommendations(20);
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
        추천 도서
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {recommendations.map((item) => (
          <div
            key={item.bookId}
            onClick={() => navigate(`/books/${item.bookId}`)}
            style={{
              padding: '1.5rem',
              border: '2px solid #4CAF50',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{item.title}</h3>
            <p style={{ color: '#666', marginBottom: '0.5rem' }}>저자: {item.author}</p>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              장르: {item.genre}
            </p>
            <div style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              borderRadius: '12px',
              fontSize: '0.85rem',
            }}>
              영상 준비 완료
            </div>
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              조회수: {item.requestCount} | 점수: {item.rankingScore.toFixed(1)}
            </p>
          </div>
        ))}
      </div>

      {recommendations.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
          추천 도서가 없습니다.
        </p>
      )}
    </div>
  );
}
