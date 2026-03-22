/**
 * 한글 조합 데이터 테이블
 * - 초성/중성/종성 매핑
 * - 복합 자음/모음 조합 및 분리 테이블
 * - Unicode 음절 조합 함수
 */

// 초성 19자
export const CHO_TABLE = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
] as const;

// 중성 21자
export const JUNG_TABLE = [
  'ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ',
] as const;

// 종성 28자 (index 0 = 종성 없음)
export const JONG_TABLE = [
  '','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
] as const;

// Jamo → 초성 index
export const CHO_MAP: Record<string, number> = {};
CHO_TABLE.forEach((ch, i) => { CHO_MAP[ch] = i; });

// Jamo → 중성 index
export const JUNG_MAP: Record<string, number> = {};
JUNG_TABLE.forEach((ch, i) => { JUNG_MAP[ch] = i; });

// 자음 → 종성 index (ㄸ, ㅃ, ㅉ은 종성이 될 수 없음)
export const CHO_TO_JONG: Record<string, number> = {
  'ㄱ': 1, 'ㄲ': 2, 'ㄴ': 4, 'ㄷ': 7, 'ㄹ': 8, 'ㅁ': 16, 'ㅂ': 17,
  'ㅅ': 19, 'ㅆ': 20, 'ㅇ': 21, 'ㅈ': 22, 'ㅊ': 23, 'ㅋ': 24, 'ㅌ': 25, 'ㅍ': 26, 'ㅎ': 27,
};

// 종성 index → 초성 자모 (종성 분리 시 사용)
export const JONG_TO_CHO: Record<number, string> = {
  1: 'ㄱ', 2: 'ㄲ', 4: 'ㄴ', 7: 'ㄷ', 8: 'ㄹ', 16: 'ㅁ', 17: 'ㅂ',
  19: 'ㅅ', 20: 'ㅆ', 21: 'ㅇ', 22: 'ㅈ', 23: 'ㅊ', 24: 'ㅋ', 25: 'ㅌ', 26: 'ㅍ', 27: 'ㅎ',
};

// 복합 중성: "기존중성idx|새모음자모" → 복합중성idx
export const COMPOUND_JUNG: Record<string, number> = {
  '8|ㅏ': 9,   // ㅗ + ㅏ → ㅘ
  '8|ㅐ': 10,  // ㅗ + ㅐ → ㅙ
  '8|ㅣ': 11,  // ㅗ + ㅣ → ㅚ
  '13|ㅓ': 14, // ㅜ + ㅓ → ㅝ
  '13|ㅔ': 15, // ㅜ + ㅔ → ㅞ
  '13|ㅣ': 16, // ㅜ + ㅣ → ㅟ
  '18|ㅣ': 19, // ㅡ + ㅣ → ㅢ
};

// 복합 중성 분리 (backspace용): 복합중성idx → [원래중성idx, 제거할모음자모]
export const COMPOUND_JUNG_SPLIT: Record<number, [number, string]> = {
  9:  [8, 'ㅏ'],  // ㅘ → ㅗ + ㅏ
  10: [8, 'ㅐ'],  // ㅙ → ㅗ + ㅐ
  11: [8, 'ㅣ'],  // ㅚ → ㅗ + ㅣ
  14: [13, 'ㅓ'], // ㅝ → ㅜ + ㅓ
  15: [13, 'ㅔ'], // ㅞ → ㅜ + ㅔ
  16: [13, 'ㅣ'], // ㅟ → ㅜ + ㅣ
  19: [18, 'ㅣ'], // ㅢ → ㅡ + ㅣ
};

// 복합 종성: "기존종성idx|새자음자모" → 복합종성idx
export const COMPOUND_JONG: Record<string, number> = {
  '1|ㅅ': 3,   // ㄱ + ㅅ → ㄳ
  '4|ㅈ': 5,   // ㄴ + ㅈ → ㄵ
  '4|ㅎ': 6,   // ㄴ + ㅎ → ㄶ
  '8|ㄱ': 9,   // ㄹ + ㄱ → ㄺ
  '8|ㅁ': 10,  // ㄹ + ㅁ → ㄻ
  '8|ㅂ': 11,  // ㄹ + ㅂ → ㄼ
  '8|ㅅ': 12,  // ㄹ + ㅅ → ㄽ
  '8|ㅌ': 13,  // ㄹ + ㅌ → ㄾ
  '8|ㅍ': 14,  // ㄹ + ㅍ → ㄿ
  '8|ㅎ': 15,  // ㄹ + ㅎ → ㅀ
  '17|ㅅ': 18, // ㅂ + ㅅ → ㅄ
};

// 복합 종성 분리: 복합종성idx → [남는종성idx, 새초성자모]
export const COMPOUND_JONG_SPLIT: Record<number, [number, string]> = {
  3:  [1, 'ㅅ'],  // ㄳ → ㄱ + ㅅ
  5:  [4, 'ㅈ'],  // ㄵ → ㄴ + ㅈ
  6:  [4, 'ㅎ'],  // ㄶ → ㄴ + ㅎ
  9:  [8, 'ㄱ'],  // ㄺ → ㄹ + ㄱ
  10: [8, 'ㅁ'],  // ㄻ → ㄹ + ㅁ
  11: [8, 'ㅂ'],  // ㄼ → ㄹ + ㅂ
  12: [8, 'ㅅ'],  // ㄽ → ㄹ + ㅅ
  13: [8, 'ㅌ'],  // ㄾ → ㄹ + ㅌ
  14: [8, 'ㅍ'],  // ㄿ → ㄹ + ㅍ
  15: [8, 'ㅎ'],  // ㅀ → ㄹ + ㅎ
  18: [17, 'ㅅ'], // ㅄ → ㅂ + ㅅ
};

// Unicode 한글 음절 조합: 0xAC00 + (초성idx × 21 + 중성idx) × 28 + 종성idx
const HANGUL_BASE = 0xAC00;

export function composeSyllable(cho: number, jung: number, jong: number = 0): string {
  return String.fromCharCode(HANGUL_BASE + (cho * 21 + jung) * 28 + jong);
}

export function isConsonant(jamo: string): boolean {
  return jamo in CHO_MAP;
}

export function isVowel(jamo: string): boolean {
  return jamo in JUNG_MAP;
}
