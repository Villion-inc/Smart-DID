/**
 * 키보드 레이아웃 정의
 * - 한글 두벌식
 * - 영문 QWERTY
 */

export type KeyType = 'char' | 'shift' | 'backspace' | 'lang' | 'space' | 'search';

export interface KeyDef {
  type: KeyType;
  label: string;
  shiftLabel?: string;
  value?: string;
  shiftValue?: string;
  flex?: number;
}

export const KOREAN_LAYOUT: KeyDef[][] = [
  // Row 1
  [
    { type: 'char', label: 'ㅂ', value: 'ㅂ', shiftLabel: 'ㅃ', shiftValue: 'ㅃ' },
    { type: 'char', label: 'ㅈ', value: 'ㅈ', shiftLabel: 'ㅉ', shiftValue: 'ㅉ' },
    { type: 'char', label: 'ㄷ', value: 'ㄷ', shiftLabel: 'ㄸ', shiftValue: 'ㄸ' },
    { type: 'char', label: 'ㄱ', value: 'ㄱ', shiftLabel: 'ㄲ', shiftValue: 'ㄲ' },
    { type: 'char', label: 'ㅅ', value: 'ㅅ', shiftLabel: 'ㅆ', shiftValue: 'ㅆ' },
    { type: 'char', label: 'ㅛ', value: 'ㅛ' },
    { type: 'char', label: 'ㅕ', value: 'ㅕ' },
    { type: 'char', label: 'ㅑ', value: 'ㅑ' },
    { type: 'char', label: 'ㅐ', value: 'ㅐ', shiftLabel: 'ㅒ', shiftValue: 'ㅒ' },
    { type: 'char', label: 'ㅔ', value: 'ㅔ', shiftLabel: 'ㅖ', shiftValue: 'ㅖ' },
  ],
  // Row 2
  [
    { type: 'char', label: 'ㅁ', value: 'ㅁ' },
    { type: 'char', label: 'ㄴ', value: 'ㄴ' },
    { type: 'char', label: 'ㅇ', value: 'ㅇ' },
    { type: 'char', label: 'ㄹ', value: 'ㄹ' },
    { type: 'char', label: 'ㅎ', value: 'ㅎ' },
    { type: 'char', label: 'ㅗ', value: 'ㅗ' },
    { type: 'char', label: 'ㅓ', value: 'ㅓ' },
    { type: 'char', label: 'ㅏ', value: 'ㅏ' },
    { type: 'char', label: 'ㅣ', value: 'ㅣ' },
  ],
  // Row 3
  [
    { type: 'shift', label: '⇧', flex: 1.3 },
    { type: 'char', label: 'ㅋ', value: 'ㅋ' },
    { type: 'char', label: 'ㅌ', value: 'ㅌ' },
    { type: 'char', label: 'ㅊ', value: 'ㅊ' },
    { type: 'char', label: 'ㅍ', value: 'ㅍ' },
    { type: 'char', label: 'ㅠ', value: 'ㅠ' },
    { type: 'char', label: 'ㅜ', value: 'ㅜ' },
    { type: 'char', label: 'ㅡ', value: 'ㅡ' },
    { type: 'backspace', label: '⌫', flex: 1.3 },
  ],
  // Row 4
  [
    { type: 'lang', label: '한/영', flex: 1.5 },
    { type: 'space', label: ' ', flex: 5 },
    { type: 'search', label: '검색', flex: 1.5 },
  ],
];

export const ENGLISH_LAYOUT: KeyDef[][] = [
  // Row 1
  [
    { type: 'char', label: 'q', value: 'q', shiftLabel: 'Q', shiftValue: 'Q' },
    { type: 'char', label: 'w', value: 'w', shiftLabel: 'W', shiftValue: 'W' },
    { type: 'char', label: 'e', value: 'e', shiftLabel: 'E', shiftValue: 'E' },
    { type: 'char', label: 'r', value: 'r', shiftLabel: 'R', shiftValue: 'R' },
    { type: 'char', label: 't', value: 't', shiftLabel: 'T', shiftValue: 'T' },
    { type: 'char', label: 'y', value: 'y', shiftLabel: 'Y', shiftValue: 'Y' },
    { type: 'char', label: 'u', value: 'u', shiftLabel: 'U', shiftValue: 'U' },
    { type: 'char', label: 'i', value: 'i', shiftLabel: 'I', shiftValue: 'I' },
    { type: 'char', label: 'o', value: 'o', shiftLabel: 'O', shiftValue: 'O' },
    { type: 'char', label: 'p', value: 'p', shiftLabel: 'P', shiftValue: 'P' },
  ],
  // Row 2
  [
    { type: 'char', label: 'a', value: 'a', shiftLabel: 'A', shiftValue: 'A' },
    { type: 'char', label: 's', value: 's', shiftLabel: 'S', shiftValue: 'S' },
    { type: 'char', label: 'd', value: 'd', shiftLabel: 'D', shiftValue: 'D' },
    { type: 'char', label: 'f', value: 'f', shiftLabel: 'F', shiftValue: 'F' },
    { type: 'char', label: 'g', value: 'g', shiftLabel: 'G', shiftValue: 'G' },
    { type: 'char', label: 'h', value: 'h', shiftLabel: 'H', shiftValue: 'H' },
    { type: 'char', label: 'j', value: 'j', shiftLabel: 'J', shiftValue: 'J' },
    { type: 'char', label: 'k', value: 'k', shiftLabel: 'K', shiftValue: 'K' },
    { type: 'char', label: 'l', value: 'l', shiftLabel: 'L', shiftValue: 'L' },
  ],
  // Row 3
  [
    { type: 'shift', label: '⇧', flex: 1.3 },
    { type: 'char', label: 'z', value: 'z', shiftLabel: 'Z', shiftValue: 'Z' },
    { type: 'char', label: 'x', value: 'x', shiftLabel: 'X', shiftValue: 'X' },
    { type: 'char', label: 'c', value: 'c', shiftLabel: 'C', shiftValue: 'C' },
    { type: 'char', label: 'v', value: 'v', shiftLabel: 'V', shiftValue: 'V' },
    { type: 'char', label: 'b', value: 'b', shiftLabel: 'B', shiftValue: 'B' },
    { type: 'char', label: 'n', value: 'n', shiftLabel: 'N', shiftValue: 'N' },
    { type: 'char', label: 'm', value: 'm', shiftLabel: 'M', shiftValue: 'M' },
    { type: 'backspace', label: '⌫', flex: 1.3 },
  ],
  // Row 4
  [
    { type: 'lang', label: '한/영', flex: 1.5 },
    { type: 'space', label: ' ', flex: 5 },
    { type: 'search', label: '검색', flex: 1.5 },
  ],
];
