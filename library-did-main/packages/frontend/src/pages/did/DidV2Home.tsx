import { useNavigate } from 'react-router-dom';
import { DidV2Layout } from './DidV2Layout';
import type { AgeGroup } from '../../types';

/**
 * 연령 선택 - 누가 볼까요? (참고 디자인: 밝은 그라데이션, 둥근 카드, 이모지)
 */
const AGE_OPTIONS: { group: AgeGroup; emoji: string; label: string; sub: string }[] = [
  {
    group: 'preschool',
    emoji: '👶',
    label: '4-6세',
    sub: '그림책 · 짧은 문장',
  },
  {
    group: 'elementary',
    emoji: '👧',
    label: '7-9세',
    sub: '호기심 · 질문형 자막',
  },
  {
    group: 'teen',
    emoji: '🤔',
    label: '10-13세',
    sub: '탐구 · 주제/키워드 강화',
  },
];

export function DidV2Home() {
  const navigate = useNavigate();

  return (
    <DidV2Layout title="북메이트 추천도서">
      <div
        className="flex w-full max-w-[480px] flex-1 flex-col items-center justify-center px-4 py-6"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        <p className="mb-2 text-center text-2xl font-bold leading-snug text-gray-800">
          누가 볼까요?
        </p>
        <p className="mb-8 text-center text-sm font-medium leading-snug text-gray-600">
          연령을 선택하면 추천 영상과 문장이 맞춰져요.
        </p>

        <div className="flex w-full flex-col items-center gap-4">
          {AGE_OPTIONS.map(({ group, emoji, label, sub }) => (
            <button
              key={group}
              type="button"
              onClick={() => navigate(`/did/age/${group}`)}
              className="flex w-full max-w-[420px] items-center gap-4 rounded-3xl px-5 py-4 text-left transition active:scale-[0.98]"
              style={{
                background: 'linear-gradient(180deg, rgba(184, 230, 245, 0.85) 0%, rgba(168, 216, 234, 0.75) 100%)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(255,255,255,0.5) inset',
              }}
            >
              <span className="text-4xl drop-shadow-sm" aria-hidden>
                {emoji}
              </span>
              <div className="flex flex-1 flex-col">
                <span className="text-lg font-extrabold leading-tight text-gray-800 drop-shadow-sm">
                  {label}
                </span>
                <span className="mt-0.5 text-sm font-medium text-gray-600">
                  {sub}
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-500" aria-hidden>
                ›
              </span>
            </button>
          ))}
        </div>
      </div>
    </DidV2Layout>
  );
}
