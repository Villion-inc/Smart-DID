import { useNavigate } from 'react-router-dom';
import { DidV2Layout } from './DidV2Layout';
import type { AgeGroup } from '../../types';

/**
 * Frame 12 - 누가 볼까요? 연령 선택 (유아 / 아동 / 청소년)
 */
const AGE_OPTIONS: { group: AgeGroup; emoji: string; label: string; sub: string }[] = [
  {
    group: 'preschool',
    emoji: '👶🏻',
    label: '유아 추천',
    sub: '그림책, 짧은 문장',
  },
  {
    group: 'elementary',
    emoji: '🧑🏻',
    label: '아동 추천',
    sub: '호기심, 질문형',
  },
  {
    group: 'teen',
    emoji: '🙍🏻‍♂️',
    label: '청소년 추천',
    sub: '탐구, 주제/키워드 강화',
  },
];

export function DidV2Home() {
  const navigate = useNavigate();

  return (
    <DidV2Layout title="북메이트 추천도서">
      <div className="px-4 pt-4" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <p className="mb-4 text-lg font-bold leading-snug text-black">
          누가 볼까요? 버튼을 눌러서 시작해요!
        </p>

        <div className="flex flex-col gap-3">
          {AGE_OPTIONS.map(({ group, emoji, label, sub }) => (
            <button
              key={group}
              type="button"
              onClick={() => navigate(`/did/age/${group}`)}
              className="flex w-full max-w-full items-center gap-4 rounded-2xl px-4 py-3 text-left"
              style={{
                background: '#D9D9D9',
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
              }}
            >
              <span className="text-3xl">{emoji}</span>
              <div className="flex flex-col">
                <span className="text-base font-extrabold leading-tight text-black">
                  {label} {sub}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </DidV2Layout>
  );
}
