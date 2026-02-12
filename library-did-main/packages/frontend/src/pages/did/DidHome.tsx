import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeType, THEME_LABELS } from '../../types';

/**
 * DidHome - GenTA 테마 선택 페이지 (Step 1)
 * 1920x1200 키오스크 화면에 최적화
 */
export const DidHome = () => {
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState<ThemeType | null>(null);

  const themes: { type: ThemeType; emoji: string }[] = [
    { type: 'adventure', emoji: '🏔️' },
    { type: 'fairytale', emoji: '🏰' },
    { type: 'science', emoji: '🔬' },
    { type: 'comic', emoji: '📚' },
    { type: 'history', emoji: '🏛️' },
  ];

  const handleNext = () => {
    if (selectedTheme) {
      navigate(`/did/books/${selectedTheme}`);
    }
  };

  const handleAiRecommend = () => {
    navigate('/did/ai');
  };

  return (
    <div className="relative w-[1920px] h-[1200px] bg-white mx-auto overflow-hidden">
      {/* GenTA Logo - left:76px, top:62px */}
      <div className="absolute left-[76px] top-[62px] flex items-center gap-4">
        <img 
          src="/genta-logo.png" 
          alt="GenTA" 
          className="w-[83px] h-[80px] object-contain"
        />
      </div>

      {/* Title Box - center, top:44px */}
      <div 
        className="absolute left-[655px] top-[44px] w-[655px] h-[124px] 
                   border border-black rounded-[60px] flex items-center justify-center"
        style={{ background: 'rgba(255, 255, 255, 0.1)' }}
      >
        <span className="text-[48px] font-bold text-black">꿈샘어린이청소년도서관</span>
      </div>

      {/* Subtitle - top:187px */}
      <p className="absolute left-[777px] top-[187px] w-[411px] text-[30px] text-black text-center">
        아산시립도서관 | AI 영상 생성 체험
      </p>

      {/* Main Title - top:275px */}
      <h1 className="absolute left-[551px] top-[275px] w-[924px] text-[48px] font-bold text-black text-center leading-[58px]">
        좋아하는 테마를 골라 책 영상을 만나보세요! 📚✨
      </h1>

      {/* Progress Indicator - top:367px */}
      <div className="absolute left-[515px] top-[367px] flex items-center">
        {[1, 2, 3, 4].map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-[115px] h-[110px] rounded-full flex items-center justify-center
                         text-[48px] font-bold border border-black shadow-md
                         ${step === 1 ? 'bg-black text-white' : 'bg-[#D9D9D9] text-black'}`}
            >
              {step}
            </div>
            {index < 3 && (
              <div className="w-[65px] h-0 border-t border-black mx-[56px]" />
            )}
          </div>
        ))}
      </div>

      {/* Theme Selection Card - top:535px */}
      <div 
        className="absolute left-[104px] top-[535px] w-[1712px] h-[563px]
                   border border-black rounded-[30px] shadow-md"
      >
        {/* Card Title */}
        <h2 className="absolute left-[123px] top-[93px] text-[40px] font-bold text-black">
          📒 좋아하는 테마를 선택해 주세요!
        </h2>

        {/* Theme Buttons - 5개, top:173px (카드 내부 기준) */}
        <div className="absolute left-[115px] top-[173px] flex gap-[38px]">
          {themes.map(({ type, emoji }) => (
            <button
              key={type}
              onClick={() => setSelectedTheme(type)}
              className={`w-[266px] h-[168px] rounded-[30px] border border-black shadow-md
                         flex flex-col items-center justify-center transition-all
                         ${selectedTheme === type
                           ? 'bg-black text-white'
                           : 'bg-white text-black hover:bg-gray-50'
                         }`}
            >
              <span className="text-[40px]">{emoji}</span>
              <span className="text-[40px] font-bold">{THEME_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Next Button - top:928px */}
      <button
        onClick={handleNext}
        disabled={!selectedTheme}
        className={`absolute left-[204px] top-[928px] w-[1497px] h-[111px]
                   rounded-[40px] shadow-md flex items-center justify-center transition-all
                   ${selectedTheme
                     ? 'bg-[#D9D9D9] hover:bg-gray-400 text-black cursor-pointer'
                     : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                   }`}
      >
        <span className="text-[40px] font-bold">→ 다음 단계로</span>
      </button>

      {/* AI Recommend Link (optional) */}
      <button
        onClick={handleAiRecommend}
        className="absolute right-[100px] top-[80px] text-[24px] text-gray-500 hover:text-black"
      >
        🤖 AI 추천
      </button>
    </div>
  );
};
