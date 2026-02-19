import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book } from '../../types';
import { bookApi } from '../../api/book.api';
import { adminApi } from '../../api/admin.api';
import { useAuthStore } from '../../stores/authStore';

export function AdminDashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    loadBooks();
  }, [isAuthenticated, navigate]);

  const loadBooks = async () => {
    try {
      const data = await bookApi.searchBooks();
      setBooks(data);
    } catch (error) {
      console.error('Failed to load books:', error);
    }
  };

  const handlePreGenerate = async (bookId: string) => {
    setLoading(true);
    try {
      await adminApi.requestVideoGeneration(bookId);
      alert('영상 사전 생성이 요청되었습니다.');
    } catch (error) {
      console.error('Failed to pre-generate video:', error);
      alert('영상 사전 생성 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem' }}>관리자 대시보드</h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>도서 목록 및 영상 사전 생성</h2>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>도서명</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>저자</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>장르</th>
            <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '2px solid #ddd' }}>작업</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '0.75rem' }}>{book.title}</td>
              <td style={{ padding: '0.75rem' }}>{book.author}</td>
              <td style={{ padding: '0.75rem' }}>{book.category}</td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <button
                  onClick={() => handlePreGenerate(book.id)}
                  disabled={loading}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '0.5rem',
                  }}
                >
                  영상 생성
                </button>
                <button
                  onClick={() => navigate(`/books/${book.id}`)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  상세보기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {books.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>
          등록된 도서가 없습니다.
        </p>
      )}
    </div>
  );
}
