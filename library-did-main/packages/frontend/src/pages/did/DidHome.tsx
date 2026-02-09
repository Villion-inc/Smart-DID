import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDidStore } from '../../stores/didStore';
import { HorizontalBookScroll } from '../../components/HorizontalBookScroll';
import { DidBookCard } from '../../components/DidBookCard';
import { DidMenuType } from '../../types';

/**
 * DidHome
 *
 * Main DID (Digital Information Display) touch interface page.
 * Features large touch buttons for menu selection and horizontal book lists.
 * Designed for fullscreen kiosk display in public library.
 */
export const DidHome = () => {
  const navigate = useNavigate();
  const {
    activeMenu,
    setActiveMenu,
    newArrivals,
    librarianPicks,
    preschoolBooks,
    elementaryBooks,
    teenBooks,
    isLoading,
    error,
    fetchNewArrivals,
    fetchLibrarianPicks,
    fetchBooksByAge,
  } = useDidStore();

  // Load initial menu content
  useEffect(() => {
    if (activeMenu === null) {
      // Default to new arrivals on first load
      setActiveMenu('new-arrivals');
    }
  }, []);

  // Fetch data when menu changes
  useEffect(() => {
    if (!activeMenu) return;

    switch (activeMenu) {
      case 'new-arrivals':
        fetchNewArrivals();
        break;
      case 'librarian-picks':
        fetchLibrarianPicks();
        break;
      case 'age-preschool':
        fetchBooksByAge('preschool');
        break;
      case 'age-elementary':
        fetchBooksByAge('elementary');
        break;
      case 'age-teen':
        fetchBooksByAge('teen');
        break;
    }
  }, [activeMenu]);

  const handleMenuClick = (menu: DidMenuType) => {
    setActiveMenu(menu);
  };

  const handleBookClick = (bookId: string) => {
    navigate(`/did/books/${bookId}`);
  };

  // Get current book list based on active menu
  const getCurrentBooks = () => {
    switch (activeMenu) {
      case 'new-arrivals':
        return newArrivals;
      case 'librarian-picks':
        return librarianPicks;
      case 'age-preschool':
        return preschoolBooks;
      case 'age-elementary':
        return elementaryBooks;
      case 'age-teen':
        return teenBooks;
      default:
        return [];
    }
  };

  const getMenuTitle = () => {
    switch (activeMenu) {
      case 'new-arrivals':
        return '신착 도서';
      case 'librarian-picks':
        return '사서 추천 도서';
      case 'age-preschool':
        return '유아 도서';
      case 'age-elementary':
        return '초등 도서';
      case 'age-teen':
        return '청소년 도서';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-12 py-8">
          <h1 className="text-5xl font-bold text-blue-600">꿈샘 도서관</h1>
          <p className="text-2xl text-gray-600 mt-2">책을 터치해서 자세히 알아보세요</p>
        </div>
      </header>

      {/* Menu Buttons */}
      <div className="container mx-auto px-12 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
          {/* New Arrivals */}
          <button
            onClick={() => handleMenuClick('new-arrivals')}
            className={`h-32 rounded-3xl shadow-xl font-bold text-3xl
                       transform transition-all active:scale-95
                       ${
                         activeMenu === 'new-arrivals'
                           ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white scale-105'
                           : 'bg-white text-gray-800 hover:shadow-2xl'
                       }`}
          >
            📚 신착 도서
          </button>

          {/* Librarian Picks */}
          <button
            onClick={() => handleMenuClick('librarian-picks')}
            className={`h-32 rounded-3xl shadow-xl font-bold text-3xl
                       transform transition-all active:scale-95
                       ${
                         activeMenu === 'librarian-picks'
                           ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white scale-105'
                           : 'bg-white text-gray-800 hover:shadow-2xl'
                       }`}
          >
            ⭐ 사서 추천
          </button>

          {/* Preschool */}
          <button
            onClick={() => handleMenuClick('age-preschool')}
            className={`h-32 rounded-3xl shadow-xl font-bold text-3xl
                       transform transition-all active:scale-95
                       ${
                         activeMenu === 'age-preschool'
                           ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white scale-105'
                           : 'bg-white text-gray-800 hover:shadow-2xl'
                       }`}
          >
            🧸 유아
          </button>

          {/* Elementary */}
          <button
            onClick={() => handleMenuClick('age-elementary')}
            className={`h-32 rounded-3xl shadow-xl font-bold text-3xl
                       transform transition-all active:scale-95
                       ${
                         activeMenu === 'age-elementary'
                           ? 'bg-gradient-to-r from-green-500 to-green-600 text-white scale-105'
                           : 'bg-white text-gray-800 hover:shadow-2xl'
                       }`}
          >
            🎒 초등
          </button>

          {/* Teen */}
          <button
            onClick={() => handleMenuClick('age-teen')}
            className={`h-32 rounded-3xl shadow-xl font-bold text-3xl
                       transform transition-all active:scale-95
                       ${
                         activeMenu === 'age-teen'
                           ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white scale-105'
                           : 'bg-white text-gray-800 hover:shadow-2xl'
                       }`}
          >
            📖 청소년
          </button>
        </div>
      </div>

      {/* Book List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-2xl text-gray-600">책을 불러오는 중...</p>
          </div>
        </div>
      ) : error ? (
        <div className="container mx-auto px-12 py-12">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <p className="text-2xl text-red-600 font-medium">{error}</p>
          </div>
        </div>
      ) : getCurrentBooks().length > 0 ? (
        <HorizontalBookScroll title={getMenuTitle()}>
          {getCurrentBooks().map((book) => (
            <DidBookCard key={book.id} book={book} onClick={() => handleBookClick(book.id)} />
          ))}
        </HorizontalBookScroll>
      ) : (
        <div className="container mx-auto px-12 py-12 text-center">
          <p className="text-2xl text-gray-500">도서가 없습니다</p>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-24 py-12 bg-gray-100">
        <div className="container mx-auto px-12 text-center">
          <p className="text-xl text-gray-600">
            도서관 이용 시간: 평일 09:00 - 18:00 | 주말 10:00 - 17:00
          </p>
          <p className="text-lg text-gray-500 mt-2">
            문의: 031-XXX-XXXX
          </p>
        </div>
      </footer>
    </div>
  );
};
