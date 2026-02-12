import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';

const SECTION_TITLE = 'text-[18px] font-bold leading-tight text-black';
const INPUT_BOX = 'w-full rounded-[30px] border border-[#E8E8E8] bg-[#FAF9F9] px-4 py-3 text-[15px]';
const INPUT_BOX_TALL = 'w-full rounded-[30px] border border-[#E8E8E8] bg-[#FAF9F9] px-4 py-3 text-[15px] min-h-[80px]';

const AGE_OPTIONS = ['4-6', '7-9', '10-12', '13-15', '전체'];
const ZONE_COLORS = ['YELLOW', 'RED', 'BLUE', 'GREEN', 'ORANGE'];

export function AdminRecommendBook() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [ageGroup, setAgeGroup] = useState('4-6');
  const [question, setQuestion] = useState('');
  const [tags, setTags] = useState('');
  const [coverEmoji, setCoverEmoji] = useState('📒');
  const [zoneColor, setZoneColor] = useState('YELLOW');
  const [shelf, setShelf] = useState('1');
  const [row, setRow] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // TODO: API 연동 - 추천도서 등록
      await new Promise((r) => setTimeout(r, 500));
      alert('등록 기능은 백엔드 API 연동 후 사용 가능합니다.');
      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout title="BOOK MATE 관리자">
      <div className="px-4 pb-8 pt-5" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <div className="rounded-[30px] border border-black bg-white p-4">
          <h2 className={`mb-1 ${SECTION_TITLE}`}>추천도서 업로드</h2>
          <p className="mb-4 text-base font-bold text-black">
            등록하면 유저 메인(추천)에 바로 나타나요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`mb-1 block ${SECTION_TITLE}`}>제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="새로운 책 제목"
                className={`h-11 ${INPUT_BOX}`}
              />
            </div>

            <div>
              <label className={`mb-1 block ${SECTION_TITLE}`}>연령대</label>
              <div className="relative">
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="h-11 w-full appearance-none rounded-[30px] border border-[#E8E8E8] bg-[#FAF9F9] pl-4 pr-10 text-[15px] text-black"
                >
                  {AGE_OPTIONS.map((age) => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black text-xs">▼</span>
              </div>
            </div>

            <div>
              <label className={`mb-1 block ${SECTION_TITLE}`}>질문 (자막)</label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="이 다음엔 무슨 일이 생길까?"
                className={INPUT_BOX_TALL}
                rows={3}
              />
            </div>

            <div>
              <label className={`mb-1 block ${SECTION_TITLE}`}>태그</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="귀여움, 모험"
                className={`h-11 ${INPUT_BOX}`}
              />
            </div>

            <div>
              <label className={`mb-1 block ${SECTION_TITLE}`}>커버 (이모지)</label>
              <input
                type="text"
                value={coverEmoji}
                onChange={(e) => setCoverEmoji(e.target.value)}
                placeholder="📒"
                className={`h-11 ${INPUT_BOX}`}
              />
            </div>

            <div>
              <label className={`mb-1 block ${SECTION_TITLE}`}>존 생상</label>
              <div className="relative">
                <select
                  value={zoneColor}
                  onChange={(e) => setZoneColor(e.target.value)}
                  className="h-11 w-full appearance-none rounded-[30px] border border-[#E8E8E8] bg-[#FAF9F9] pl-4 pr-10 text-[15px] text-black"
                >
                  {ZONE_COLORS.map((color) => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black text-xs">▼</span>
              </div>
            </div>

            <div>
              <label className={`mb-1 block ${SECTION_TITLE}`}>책장 / 줄</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={shelf}
                  onChange={(e) => setShelf(e.target.value)}
                  placeholder="1"
                  className={`h-11 ${INPUT_BOX}`}
                />
                <input
                  type="text"
                  value={row}
                  onChange={(e) => setRow(e.target.value)}
                  placeholder="1"
                  className={`h-11 ${INPUT_BOX}`}
                />
              </div>
            </div>

            <p className="text-xs leading-snug text-[#FF0000]">
              실제 서비스에서는: 사용자/단말 ID, 세션, 도서 ISBN, 생성 상태 (성공/실패), API 응답 시간도 함께 저장 가능
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-14 w-full items-center justify-center rounded-[40px] bg-black text-base font-bold text-white shadow"
              style={{ boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)' }}
            >
              📒 등록하기 (메인에 노출)
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
