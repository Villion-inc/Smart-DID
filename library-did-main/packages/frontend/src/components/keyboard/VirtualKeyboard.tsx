/**
 * 가상 키보드 컨테이너 (오케스트레이터)
 * - 한/영 전환, Shift 관리
 * - 슬라이드업 애니메이션
 * - 리퀴드 글라스 배경
 */
import { useState, useEffect } from 'react';
import { KOREAN_LAYOUT, ENGLISH_LAYOUT } from './keyboardLayouts';
import type { KeyDef } from './keyboardLayouts';
import { KeyboardKey } from './KeyboardKey';

interface VirtualKeyboardProps {
  onChar: (char: string, isKorean: boolean) => void;
  onBackspace: () => void;
  onSpace: () => void;
  onSearch: () => void;
  onLangChange?: () => void;
  onDismiss?: () => void;
}

export function VirtualKeyboard({
  onChar,
  onBackspace,
  onSpace,
  onSearch,
  onLangChange,
  onDismiss,
}: VirtualKeyboardProps) {
  const [isKorean, setIsKorean] = useState(true);
  const [shifted, setShifted] = useState(false);
  const [visible, setVisible] = useState(false);

  // 슬라이드업 애니메이션
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const layout = isKorean ? KOREAN_LAYOUT : ENGLISH_LAYOUT;

  const handlePress = (keyDef: KeyDef) => {
    switch (keyDef.type) {
      case 'char': {
        const value = shifted && keyDef.shiftValue ? keyDef.shiftValue : keyDef.value!;
        onChar(value, isKorean);
        if (shifted) setShifted(false);
        break;
      }
      case 'backspace':
        onBackspace();
        break;
      case 'space':
        onSpace();
        break;
      case 'shift':
        setShifted(s => !s);
        break;
      case 'lang':
        onLangChange?.();
        setIsKorean(k => !k);
        setShifted(false);
        break;
      case 'search':
        onSearch();
        break;
    }
  };

  return (
    <div
      className="shrink-0 border-t"
      style={{
        height: '50vh',
        background: 'rgba(255,255,255,0.25)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: 'rgba(255,255,255,0.5)',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '0.75rem',
        paddingBottom: '0.75rem',
      }}
    >
      <div className="mx-auto flex w-full flex-1 flex-col gap-2 px-2 sm:gap-2.5 sm:px-3">
        {layout.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className="flex flex-1 gap-1.5 sm:gap-2"
          >
            {row.map((keyDef, keyIdx) => (
              <KeyboardKey
                key={`${rowIdx}-${keyIdx}`}
                keyDef={keyDef}
                shifted={shifted}
                onPress={() => handlePress(keyDef)}
              />
            ))}
          </div>
        ))}
        {/* 키보드 내리기 버튼 */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-8 items-center justify-center rounded-xl touch-manipulation transition-transform duration-100 active:scale-[0.93]"
            style={{
              background: 'rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,255,255,0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            <span className="text-sm text-gray-500">▼ 키보드 닫기</span>
          </button>
        )}
      </div>
    </div>
  );
}
