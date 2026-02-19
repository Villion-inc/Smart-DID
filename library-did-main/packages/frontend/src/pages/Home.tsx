import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookStore } from '../stores/bookStore';
import { BookCard } from '../components/BookCard';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { Search } from 'lucide-react';

export const Home: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();
  const { books, isLoading, error, searchBooks } = useBookStore();

  useEffect(() => {
    // Load all books on initial mount
    searchBooks();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await searchBooks(keyword);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-6">꿈샘 도서관</h1>
          <p className="text-center text-primary-100 mb-4">
            AI 영상으로 만나는 우리 도서관의 책들
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="도서명, 저자, 카테고리로 검색..."
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              <Button type="submit" isLoading={isLoading} size="lg">
                검색
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <Loading text="도서를 검색하고 있습니다..." />
        ) : books.length > 0 ? (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              검색 결과 ({books.length}권)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={() => navigate(`/books/${book.id}`)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {keyword ? '검색 결과가 없습니다.' : '검색어를 입력하여 도서를 찾아보세요.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
