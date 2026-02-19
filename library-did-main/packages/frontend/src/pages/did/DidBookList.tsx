import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeType, THEME_LABELS, DidBook, AgeGroup } from '../../types';
import { getBooksByAge, searchBooksWithVideo } from '../../api/did.api';

// 테마 → AgeGroup 매핑 (임시)
const themeToAgeGroup: Record<string, AgeGroup> = {
  adventure: 'elementary',
  fairytale: 'preschool',
  science: 'elementary',
  comic: 'elementary',
  history: 'teen',
};

/**
 * DidBookList - 테마별 도서 목록 페이지 (Step 2)
 * 1920x1200 키오스크 화면에 최적화
 */
export const DidBookList = () => {
  const navigate = useNavigate();
  const { theme } = useParams<{ theme: string }>();
  const [books, setBooks] = useState<DidBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const themeLabel = theme ? THEME_LABELS[theme as ThemeType] || theme : '';

  useEffect(() => {
    const fetchBooks = async () => {
      if (!theme) return;
      setIsLoading(true);
      
      try {
        // 실제 API 호출 시도
        const ageGroup = themeToAgeGroup[theme] || 'elementary';
        const apiBooks = await getBooksByAge(ageGroup);
        
        if (apiBooks && apiBooks.length > 0) {
          setBooks(apiBooks.slice(0, 6));
        } else {
          // API 결과가 없으면 검색 시도
          const searchResults = await searchBooksWithVideo(themeLabel, 6);
          if (searchResults && searchResults.length > 0) {
            setBooks(searchResults);
          } else {
            // 폴백: 더미 데이터
            setBooks(getDummyBooks(theme));
          }
        }
      } catch (error) {
        console.error('Failed to fetch books:', error);
        // 에러 시 더미 데이터
        setBooks(getDummyBooks(theme));
      }
      
      setIsLoading(false);
    };

    fetchBooks();
  }, [theme, themeLabel]);

  // 더미 데이터 생성 함수
  const getDummyBooks = (themeKey: string): DidBook[] => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: `book-${themeKey}-${i + 1}`,
      title: '보물섬 모험',
      author: '김○○',
      coverImageUrl: undefined,
      shelfCode: 'A-1-1',
      category: themeKey,
    }));
  };

  const handleBack = () => {
    navigate('/did');
  };

  const handleBookSelect = (bookId: string) => {
    setSelectedBook(bookId);
  };

  const handleWatchVideo = () => {
    if (selectedBook) {
      navigate(`/did/video/${selectedBook}`);
    }
  };

  return (
    <div className="relative w-[1920px] h-[1200px] bg-white mx-auto overflow-hidden">
      {/* Header Box - left:99px, top:63px */}
      <div 
        className="absolute left-[99px] top-[63px] w-[655px] h-[105px]
                   border border-black rounded-[60px] flex items-center justify-center gap-4"
        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
      >
        <img src="/genta-logo.png" alt="GenTA" className="h-[60px] w-auto" />
        <span className="text-[48px] font-bold text-black">{themeLabel} 테마 인기 도서</span>
      </div>

      {/* Back Button - right side */}
      <button
        onClick={handleBack}
        className="absolute left-[1614px] top-[86px] text-[30px] text-black hover:text-gray-600"
      >
        ← 이전 단계로
      </button>

      {isLoading ? (
        <div className="absolute left-[860px] top-[500px] flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-2xl text-gray-600">로딩 중...</p>
        </div>
      ) : (
        <>
          {/* Book Grid - Row 1: top:255px */}
          <div className="absolute left-[264px] top-[255px] flex gap-[60px]">
            {books.slice(0, 3).map((book) => (
              <button
                key={book.id}
                onClick={() => handleBookSelect(book.id)}
                className={`w-[424px] h-[302px] rounded-[30px] border border-black shadow-md
                           flex flex-col p-4 transition-all
                           ${selectedBook === book.id ? 'ring-4 ring-black bg-gray-100' : 'bg-white'}`}
              >
                {/* Cover */}
                <div className="w-[389px] h-[180px] bg-[#D9D9D9] rounded-[40px] mx-auto flex items-center justify-center">
                  {book.coverImageUrl ? (
                    <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover rounded-[40px]" />
                  ) : (
                    <span className="text-4xl">📖</span>
                  )}
                </div>
                {/* Info */}
                <div className="mt-3 ml-2">
                  <p className="text-[28px] text-black leading-[34px]">{book.title}</p>
                  <p className="text-[28px] text-black leading-[34px]">{book.author}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Book Grid - Row 2: top:587px */}
          <div className="absolute left-[264px] top-[587px] flex gap-[60px]">
            {books.slice(3, 6).map((book) => (
              <button
                key={book.id}
                onClick={() => handleBookSelect(book.id)}
                className={`w-[424px] h-[302px] rounded-[30px] border border-black shadow-md
                           flex flex-col p-4 transition-all
                           ${selectedBook === book.id ? 'ring-4 ring-black bg-gray-100' : 'bg-white'}`}
              >
                {/* Cover */}
                <div className="w-[389px] h-[180px] bg-[#D9D9D9] rounded-[40px] mx-auto flex items-center justify-center">
                  {book.coverImageUrl ? (
                    <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover rounded-[40px]" />
                  ) : (
                    <span className="text-4xl">📖</span>
                  )}
                </div>
                {/* Info */}
                <div className="mt-3 ml-2">
                  <p className="text-[28px] text-black leading-[34px]">{book.title}</p>
                  <p className="text-[28px] text-black leading-[34px]">{book.author}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Watch Video Button - top:953px */}
          <button
            onClick={handleWatchVideo}
            disabled={!selectedBook}
            className={`absolute left-[211px] top-[953px] w-[1497px] h-[111px]
                       rounded-[40px] shadow-md flex items-center justify-center transition-all
                       ${selectedBook
                         ? 'bg-[#D9D9D9] hover:bg-gray-400 text-black cursor-pointer'
                         : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                       }`}
          >
            <span className="text-[40px] font-bold">▶ 영상 보기</span>
          </button>
        </>
      )}
    </div>
  );
};
