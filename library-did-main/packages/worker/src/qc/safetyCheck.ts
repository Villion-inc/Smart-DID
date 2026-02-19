/**
 * QC safetyGate와 동일한 키워드로 원문(title/summary) 안전 검사
 * VideoGeneratorService 초기 검증에서 사용
 */

import safetyKeywords from './safetyKeywords.json';

const allForbidden = [
  ...safetyKeywords.forbiddenWordsKorean,
  ...safetyKeywords.forbiddenWordsEnglish,
  ...safetyKeywords.forbiddenThemes,
].map((w) => w.toLowerCase());

/**
 * 단일 텍스트가 아동용 금지 단어/테마를 포함하는지 검사
 * safetyGate와 동일한 safetyKeywords.json 사용
 */
export function isTextSafeForChildren(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  const lower = text.toLowerCase();
  const hasViolation = allForbidden.some((word) => lower.includes(word));
  return !hasViolation;
}
