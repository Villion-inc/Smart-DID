import { useNavigate } from 'react-router-dom';
import { DidV2Layout } from './DidV2Layout';
import type { AgeGroup } from '../../types';

/**
 * 연령 선택 - 누가 볼까요? (키오스크 세로 화면)
 * - 이모지 사용 가능 (DID 페이지)
 */
const AGE_OPTIONS: { group: AgeGroup; label: string; sub: string; emoji: string }[] = [
  { group: 'preschool', label: '4-6세', sub: '그림책 · 짧은 문장', emoji: '🐣' },
  { group: 'elementary', label: '7-9세', sub: '호기심 · 질문형 자막', emoji: '🌟' },
  { group: 'teen', label: '10-13세', sub: '탐구 · 주제/키워드 강화', emoji: '🚀' },
];

export function DidV2Home() {
  const navigate = useNavigate();

  return (
    <DidV2Layout>
      <div className="flex flex-1 flex-col items-center justify-center py-6 sm:py-10">
        <p className="mb-2 text-center text-2xl font-bold text-gray-800 sm:mb-4 sm:text-3xl md:text-4xl">
          누가 볼까요?
        </p>
        <p className="mb-8 text-center text-base text-gray-600 sm:mb-12 sm:text-lg md:text-xl">
          연령을 선택하면 추천 영상과 문장이 맞춰져요.
        </p>

        <div className="flex w-full flex-col items-center gap-4 sm:gap-6">
          {AGE_OPTIONS.map(({ group, label, sub, emoji }) => (
            <button
              key={group}
              type="button"
              onClick={() => navigate(`/did/age/${group}`)}
              className="flex w-full items-center gap-4 rounded-2xl p-4 text-left transition active:scale-[0.98] sm:gap-6 sm:rounded-3xl sm:p-6"
              style={{
                background: 'rgba(255,255,255,0.7)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}
            >
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl sm:h-20 sm:w-20 sm:text-4xl md:h-24 md:w-24 md:text-5xl"
                style={{ background: 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)' }}
              >
                {emoji}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-xl font-bold text-gray-800 sm:text-2xl md:text-3xl">{label}</span>
                <span className="mt-1 text-sm text-gray-500 sm:mt-2 sm:text-base md:text-lg">{sub}</span>
              </div>
              <span className="text-2xl text-gray-400 sm:text-3xl">›</span>
            </button>
          ))}
        </div>
      </div>
    </DidV2Layout>
  );
}
