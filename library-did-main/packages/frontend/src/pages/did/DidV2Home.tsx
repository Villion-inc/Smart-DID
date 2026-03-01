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
      <div className="flex flex-1 flex-col items-center justify-center" style={{ padding: '80px 60px' }}>
        <p className="text-center font-bold text-gray-800" style={{ fontSize: 56, marginBottom: 24 }}>
          누가 볼까요?
        </p>
        <p className="text-center text-gray-600" style={{ fontSize: 36, marginBottom: 80 }}>
          연령을 선택하면 추천 영상과 문장이 맞춰져요.
        </p>

        <div className="flex w-full flex-col items-center" style={{ gap: 40 }}>
          {AGE_OPTIONS.map(({ group, label, sub, emoji }) => (
            <button
              key={group}
              type="button"
              onClick={() => navigate(`/did/age/${group}`)}
              className="flex w-full items-center text-left transition active:scale-[0.98]"
              style={{
                background: 'rgba(255,255,255,0.7)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                borderRadius: 32,
                padding: '40px 48px',
                gap: 40,
              }}
            >
              <div
                className="flex shrink-0 items-center justify-center"
                style={{ 
                  width: 140, 
                  height: 140, 
                  borderRadius: 32, 
                  fontSize: 72,
                  background: 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)' 
                }}
              >
                {emoji}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="font-bold text-gray-800" style={{ fontSize: 48 }}>{label}</span>
                <span className="text-gray-500" style={{ fontSize: 32, marginTop: 12 }}>{sub}</span>
              </div>
              <span className="text-gray-400" style={{ fontSize: 56 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </DidV2Layout>
  );
}
