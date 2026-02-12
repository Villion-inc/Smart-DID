import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DidBook } from '../../types';

interface RecommendedBook extends DidBook {
  description: string;
}

/**
 * DidAiRecommend - AI 도서 추천 도우미 페이지
 * 1920x1200 키오스크 화면에 최적화
 */
export const DidAiRecommend = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedBooks, setRecommendedBooks] = useState<RecommendedBook[]>([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<RecommendedBook | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    if (recommendedBooks.length > 0) {
      setRecommendedBooks([]);
      setAiMessage(null);
      setSelectedBook(null);
    } else {
      navigate('/did');
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const query = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setAiMessage(`${query}을(를) 좋아하시는군요! 스릴 넘치는 모험과 용기 있는 주인공들이 나오는 책들을 추천해 드릴게요.`);
    
    const dummyBooks: RecommendedBook[] = [
      {
        id: 'book-1',
        title: '보물섬 모험',
        author: '김○○',
        coverImageUrl: undefined,
        shelfCode: 'A-1-1',
        category: 'adventure',
        description: '미지의 섬에서 펼쳐지는 스릴 넘치는 보물찾기 모험',
      },
      {
        id: 'book-2',
        title: '정글 탐험대',
        author: '이○○',
        coverImageUrl: undefined,
        shelfCode: 'A-1-2',
        category: 'adventure',
        description: '아마존 정글 깊숙한 곳에서 벌어지는 신나는 탐험 이야기',
      },
    ];
    
    setRecommendedBooks(dummyBooks);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBookSelect = (book: RecommendedBook) => {
    setSelectedBook(book);
  };

  const handleContinue = () => {
    if (selectedBook) {
      navigate(`/did/video/${selectedBook.id}`);
    }
  };

  // 초기 상태 (추천 전)
  const showInitialState = recommendedBooks.length === 0 && !isLoading;
  // 추천 결과 상태
  const showResults = recommendedBooks.length > 0;

  // 추천 결과가 있을 때는 더 긴 페이지 (1630px)
  const pageHeight = showResults ? 1630 : 1200;

  return (
    <div className={`relative w-[1920px] bg-white mx-auto overflow-hidden`} style={{ height: `${pageHeight}px` }}>
      {/* Header Box - left:99px, top:58px */}
      <div 
        className="absolute left-[99px] top-[58px] w-[655px] h-[105px]
                   border border-black rounded-[60px] flex items-center justify-center gap-4"
        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
      >
        <img src="/genta-logo.png" alt="GenTA" className="h-[60px] w-auto" />
        <span className="text-[48px] font-bold text-black">AI 도서 추천 도우미</span>
      </div>

      {/* Back Button (결과 있을 때만) */}
      {showResults && (
        <button
          onClick={handleBack}
          className="absolute left-[1656px] top-[110px] text-[30px] text-black hover:text-gray-600"
        >
          ← 이전 단계로
        </button>
      )}

      {/* AI Message (결과 있을 때) */}
      {aiMessage && (
        <p className="absolute left-[135px] top-[176px] w-[1650px] text-[30px] text-black text-center leading-[36px]">
          {aiMessage}
        </p>
      )}

      {/* Main Content Area - top:265px */}
      <div className="absolute left-[211px] top-[265px] w-[1445px] h-[582px] bg-[#D9D9D9] rounded-[40px]">
        {showInitialState && (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-[30px] text-black text-center leading-[36px] max-w-[1013px]">
              안녕하세요! 꿈샘어린이 청소년 도서관에 오신 것을 환영해요!<br />
              어떤 책을 찾고 계신가요?<br />
              좋아하는 이야기나 관심 있는 주제를 알려주세요 😊
            </p>
          </div>
        )}

        {isLoading && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-gray-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-2xl text-gray-600">추천 도서를 찾고 있어요...</p>
          </div>
        )}

        {showResults && (
          <div className="p-8">
            <h3 className="text-[30px] font-bold text-black mb-6 ml-[60px]">추천도서:</h3>
            
            {/* Book Cards */}
            <div className="space-y-4 ml-[40px]">
              {recommendedBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => handleBookSelect(book)}
                  className={`w-[1142px] h-[176px] bg-[#F3F3F3] border border-black rounded-[40px]
                             flex items-center gap-6 px-8 transition-all text-left
                             ${selectedBook?.id === book.id ? 'ring-4 ring-black' : ''}`}
                >
                  {/* Cover */}
                  <div className="w-[117px] h-[137px] bg-[#D9D9D9] flex items-center justify-center flex-shrink-0">
                    <span className="text-[30px] text-black">표지</span>
                  </div>
                  {/* Info */}
                  <div>
                    <p className="text-[28px] font-bold text-black leading-[34px]">
                      {book.title} <span className="font-normal">{book.author}</span>
                    </p>
                    <p className="text-[28px] text-black leading-[34px] mt-2">{book.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Area - top:900px */}
      <div className="absolute left-[211px] top-[900px] w-[1272px] h-[111px] bg-[#D9D9D9] rounded-[40px] shadow-md flex items-center px-8">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="예: 모험 이야기, 공주 동화, 우주 과학...."
          className="w-full text-[35px] bg-transparent focus:outline-none text-black placeholder-[#5D5D5D]"
          disabled={isLoading}
        />
      </div>

      {/* Send Button - top:900px */}
      <button
        onClick={handleSend}
        disabled={!inputValue.trim() || isLoading}
        className={`absolute left-[1498px] top-[900px] w-[158px] h-[111px]
                   rounded-[40px] shadow-md flex items-center justify-center transition-all
                   ${inputValue.trim() && !isLoading
                     ? 'bg-[#D9D9D9] hover:bg-gray-400'
                     : 'bg-[#D9D9D9]'
                   }`}
      >
        <svg className="w-[48px] h-[48px]" fill="none" stroke="#1E1E1E" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>

      {/* Selected Book Section (결과 있을 때) - top:1064px */}
      {showResults && (
        <div className="absolute left-[203px] top-[1064px] w-[1453px] h-[332px] bg-[#D9D9D9] rounded-[40px] shadow-md">
          <h3 className="absolute left-[95px] top-[51px] text-[30px] font-bold text-black">
            📖 선택된 도서
          </h3>
          
          {selectedBook ? (
            <div className="absolute left-[93px] top-[110px] w-[1142px] h-[176px] bg-[#F3F3F3] border border-black rounded-[40px] flex items-center gap-6 px-8">
              <div className="w-[117px] h-[137px] bg-[#D9D9D9] flex items-center justify-center flex-shrink-0">
                <span className="text-[30px] text-black">표지</span>
              </div>
              <div>
                <p className="text-[28px] font-bold text-black leading-[34px]">
                  {selectedBook.title} <span className="font-normal">{selectedBook.author}</span>
                </p>
                <p className="text-[28px] text-black leading-[34px] mt-2">{selectedBook.description}</p>
              </div>
            </div>
          ) : (
            <div className="absolute left-[93px] top-[110px] w-[1142px] h-[176px] bg-[#F3F3F3] border border-black rounded-[40px] flex items-center justify-center">
              <p className="text-[28px] text-gray-500">위에서 책을 선택해주세요</p>
            </div>
          )}
        </div>
      )}

      {/* Continue Button (결과 있을 때) - top:1432px */}
      {showResults && (
        <button
          onClick={handleContinue}
          disabled={!selectedBook}
          className={`absolute left-[211px] top-[1432px] w-[1445px] h-[111px]
                     rounded-[40px] shadow-md flex items-center justify-center transition-all
                     ${selectedBook
                       ? 'bg-[#D9D9D9] hover:bg-gray-400 text-black cursor-pointer'
                       : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                     }`}
        >
          <span className="text-[35px] font-bold">선택한 책으로 계속하기 ▶</span>
        </button>
      )}
    </div>
  );
};
