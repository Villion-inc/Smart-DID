import { ReactNode, useRef, useState, useEffect } from 'react';

interface HorizontalBookScrollProps {
  children: ReactNode;
  title: string;
}

/**
 * HorizontalBookScroll
 *
 * Horizontal scrolling container for book cards.
 * Supports touch swipe and mouse drag.
 * Uses native CSS scroll-snap for smooth, performant scrolling.
 */
export const HorizontalBookScroll = ({ children, title }: HorizontalBookScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    if (!scrollRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScroll);
      return () => scrollEl.removeEventListener('scroll', checkScroll);
    }
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;

    const scrollAmount = 300; // Scroll by ~1 card width
    const newScrollLeft =
      direction === 'left'
        ? scrollRef.current.scrollLeft - scrollAmount
        : scrollRef.current.scrollLeft + scrollAmount;

    scrollRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative">
      {/* Title */}
      <h2 className="text-4xl font-bold text-gray-900 mb-8 px-12">{title}</h2>

      {/* Scroll Container */}
      <div className="relative group">
        {/* Left Arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10
                       w-16 h-16 bg-white/90 backdrop-blur rounded-full shadow-2xl
                       flex items-center justify-center
                       hover:bg-white hover:scale-110 transition-all
                       active:scale-95"
            aria-label="이전 페이지"
          >
            <svg
              className="w-8 h-8 text-gray-800"
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
          </button>
        )}

        {/* Right Arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10
                       w-16 h-16 bg-white/90 backdrop-blur rounded-full shadow-2xl
                       flex items-center justify-center
                       hover:bg-white hover:scale-110 transition-all
                       active:scale-95"
            aria-label="다음 페이지"
          >
            <svg
              className="w-8 h-8 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto px-12 pb-8 scroll-smooth
                     scrollbar-hide snap-x snap-mandatory"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
