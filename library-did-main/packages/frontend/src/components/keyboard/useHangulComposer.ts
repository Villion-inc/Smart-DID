/**
 * 한글 조합 엔진 (상태머신 훅)
 *
 * 상태 전이: EMPTY → CHO → CHO_JUNG → CHO_JUNG_JONG
 * - 복합 모음/종성 조합
 * - 종성 분리 (종성 뒤 모음 입력 시 → 다음 글자 초성으로 이동)
 * - Backspace 역순 분해
 */
import { useState, useCallback } from 'react';
import {
  CHO_TABLE, JUNG_TABLE,
  CHO_MAP, JUNG_MAP, CHO_TO_JONG, JONG_TO_CHO,
  COMPOUND_JUNG, COMPOUND_JUNG_SPLIT,
  COMPOUND_JONG, COMPOUND_JONG_SPLIT,
  composeSyllable, isConsonant, isVowel,
} from './hangulData';

interface ComposingState {
  cho: number | null;
  jung: number | null;
  jong: number | null;
}

const EMPTY: ComposingState = { cho: null, jung: null, jong: null };

function getComposingChar(s: ComposingState): string {
  const { cho, jung, jong } = s;
  if (cho !== null && jung !== null) {
    return composeSyllable(cho, jung, jong ?? 0);
  }
  if (cho !== null) return CHO_TABLE[cho];
  if (jung !== null) return JUNG_TABLE[jung];
  return '';
}

export function useHangulComposer() {
  const [committed, setCommitted] = useState('');
  const [composing, setComposing] = useState<ComposingState>(EMPTY);

  const composingText = getComposingChar(composing);

  /** 한글 자모 입력 */
  const handleKey = useCallback((jamo: string) => {
    setComposing(prev => {
      const { cho, jung, jong } = prev;

      // ── 자음 입력 ──
      if (isConsonant(jamo)) {
        const choIdx = CHO_MAP[jamo];

        // EMPTY → CHO
        if (cho === null && jung === null) {
          return { cho: choIdx, jung: null, jong: null };
        }

        // CHO → commit 이전 자음, 새 CHO
        if (cho !== null && jung === null) {
          setCommitted(c => c + CHO_TABLE[cho]);
          return { cho: choIdx, jung: null, jong: null };
        }

        // CHO_JUNG → 종성 추가 시도
        if (cho !== null && jung !== null && jong === null) {
          const jongIdx = CHO_TO_JONG[jamo];
          if (jongIdx !== undefined) {
            return { cho, jung, jong: jongIdx };
          }
          // 종성 불가 (ㄸ,ㅃ,ㅉ) → commit, 새 CHO
          setCommitted(c => c + composeSyllable(cho, jung, 0));
          return { cho: choIdx, jung: null, jong: null };
        }

        // CHO_JUNG_JONG → 복합 종성 시도
        if (cho !== null && jung !== null && jong !== null) {
          const compoundJong = COMPOUND_JONG[`${jong}|${jamo}`];
          if (compoundJong !== undefined) {
            return { cho, jung, jong: compoundJong };
          }
          // 복합 불가 → commit, 새 CHO
          setCommitted(c => c + composeSyllable(cho, jung, jong));
          return { cho: choIdx, jung: null, jong: null };
        }
      }

      // ── 모음 입력 ──
      if (isVowel(jamo)) {
        const jungIdx = JUNG_MAP[jamo];

        // EMPTY → 독립 모음 (바로 commit)
        if (cho === null && jung === null) {
          setCommitted(c => c + jamo);
          return EMPTY;
        }

        // CHO → CHO_JUNG
        if (cho !== null && jung === null) {
          return { cho, jung: jungIdx, jong: null };
        }

        // CHO_JUNG → 복합 모음 시도
        if (cho !== null && jung !== null && jong === null) {
          const compoundJung = COMPOUND_JUNG[`${jung}|${jamo}`];
          if (compoundJung !== undefined) {
            return { cho, jung: compoundJung, jong: null };
          }
          // 복합 불가 → commit 음절 + 독립 모음
          setCommitted(c => c + composeSyllable(cho, jung, 0) + jamo);
          return EMPTY;
        }

        // CHO_JUNG_JONG → 종성 분리!
        if (cho !== null && jung !== null && jong !== null) {
          const split = COMPOUND_JONG_SPLIT[jong];
          if (split) {
            // 복합 종성 분리: 앞부분은 종성으로 남고, 뒷부분이 새 초성
            const [remainingJong, newCho] = split;
            setCommitted(c => c + composeSyllable(cho, jung, remainingJong));
            return { cho: CHO_MAP[newCho], jung: jungIdx, jong: null };
          }
          // 단일 종성 → 종성이 새 초성으로 이동
          const newCho = JONG_TO_CHO[jong];
          if (newCho !== undefined) {
            setCommitted(c => c + composeSyllable(cho, jung, 0));
            return { cho: CHO_MAP[newCho], jung: jungIdx, jong: null };
          }
          // fallback
          setCommitted(c => c + composeSyllable(cho, jung, jong));
          return { cho: null, jung: jungIdx, jong: null };
        }
      }

      return prev;
    });
  }, []);

  /** Backspace: 조합 역순 분해 */
  const handleBackspace = useCallback(() => {
    setComposing(prev => {
      const { cho, jung, jong } = prev;

      // CHO_JUNG_JONG → 종성 분해/제거
      if (cho !== null && jung !== null && jong !== null) {
        const split = COMPOUND_JONG_SPLIT[jong];
        if (split) return { cho, jung, jong: split[0] };
        return { cho, jung, jong: null };
      }

      // CHO_JUNG → 중성 분해/제거
      if (cho !== null && jung !== null) {
        const split = COMPOUND_JUNG_SPLIT[jung];
        if (split) return { cho, jung: split[0], jong: null };
        return { cho, jung: null, jong: null };
      }

      // CHO → 초성 제거
      if (cho !== null) return EMPTY;

      // EMPTY → committed 마지막 글자 삭제
      setCommitted(c => c.slice(0, -1));
      return prev;
    });
  }, []);

  /** Space: 조합 확정 + 공백 */
  const handleSpace = useCallback(() => {
    setComposing(prev => {
      const char = getComposingChar(prev);
      if (char) {
        setCommitted(c => c + char + ' ');
      } else {
        setCommitted(c => c + ' ');
      }
      return EMPTY;
    });
  }, []);

  /** 영문 문자 직접 추가 (English mode) */
  const addChar = useCallback((char: string) => {
    setCommitted(c => c + char);
  }, []);

  /** 현재 조합 확정 (모드 전환 시) */
  const commitComposing = useCallback(() => {
    setComposing(prev => {
      const char = getComposingChar(prev);
      if (char) setCommitted(c => c + char);
      return EMPTY;
    });
  }, []);

  /** 전체 텍스트 반환 (검색용 — composing 포함) */
  const getFullText = useCallback((): string => {
    return committed + composingText;
  }, [committed, composingText]);

  /** 상태 초기화 */
  const reset = useCallback(() => {
    setCommitted('');
    setComposing(EMPTY);
  }, []);

  /** 텍스트 직접 설정 (URL 복원 등) */
  const setText = useCallback((text: string) => {
    setCommitted(text);
    setComposing(EMPTY);
  }, []);

  return {
    committed,
    composingText,
    displayText: committed + composingText,
    handleKey,
    handleBackspace,
    handleSpace,
    addChar,
    commitComposing,
    getFullText,
    reset,
    setText,
  };
}
