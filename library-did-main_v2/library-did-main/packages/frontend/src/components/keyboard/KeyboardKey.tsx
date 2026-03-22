/**
 * 개별 키 버튼 (리퀴드 글라스 스타일)
 */
import { useCallback } from 'react';
import type { KeyDef } from './keyboardLayouts';

interface KeyboardKeyProps {
  keyDef: KeyDef;
  shifted: boolean;
  onPress: () => void;
}

export function KeyboardKey({ keyDef, shifted, onPress }: KeyboardKeyProps) {
  const { type, label, shiftLabel, flex } = keyDef;
  const displayLabel = shifted && shiftLabel ? shiftLabel : label;
  const isSearch = type === 'search';
  const isSpecial = type === 'shift' || type === 'lang' || type === 'backspace';

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      onPress();
    },
    [onPress],
  );

  let bg: string;
  let border: string;
  let color: string;
  let fontWeight: string;
  let textClass: string;

  if (isSearch) {
    bg = 'linear-gradient(180deg, #6BB8D6 0%, #4DA3C4 100%)';
    border = '1px solid rgba(107,184,214,0.5)';
    color = 'white';
    fontWeight = '700';
    textClass = 'text-sm sm:text-base';
  } else if (isSpecial) {
    bg = type === 'shift' && shifted ? 'rgba(107,184,214,0.35)' : 'rgba(255,255,255,0.3)';
    border = type === 'shift' && shifted
      ? '1px solid rgba(107,184,214,0.5)'
      : '1px solid rgba(255,255,255,0.5)';
    color = '#374151';
    fontWeight = '600';
    textClass = type === 'lang' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base';
  } else {
    bg = 'rgba(255,255,255,0.45)';
    border = '1px solid rgba(255,255,255,0.6)';
    color = '#1f2937';
    fontWeight = '500';
    textClass = 'text-base sm:text-lg';
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={(e) => e.preventDefault()}
      className={`flex items-center justify-center rounded-xl select-none touch-manipulation transition-transform duration-100 active:scale-[0.93] ${textClass}`}
      style={{
        flex: flex ?? 1,
        height: '100%',
        background: bg,
        border,
        color,
        fontWeight,
        backdropFilter: isSearch ? undefined : 'blur(4px)',
        WebkitBackdropFilter: isSearch ? undefined : 'blur(4px)',
      }}
    >
      {displayLabel}
    </button>
  );
}
