import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { adminApi, RecommendationData, AddRecommendationInput } from '../../api/admin.api';

type AgeGroup = 'preschool' | 'elementary' | 'teen';

const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  preschool: '4-6세',
  elementary: '7-9세',
  teen: '10-13세',
};

/**
 * 추천 도서 등록 - 관리자가 직접 입력하여 등록
 * 좌측: 연령별 탭 + 등록된 추천도서 리스트
 * 우측: 도서 직접 입력 폼 (제목+저자 입력 시 네이버 표지 자동 검색)
 */
export function AdminRecommendBook() {
  const [activeTab, setActiveTab] = useState<AgeGroup>('preschool');
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchingCover, setSearchingCover] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 폼 상태
  const [form, setForm] = useState<AddRecommendationInput>({
    ageGroup: 'preschool',
    title: '',
    author: '',
    publisher: '',
    summary: '',
    coverImageUrl: '',
    category: '',
  });

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getRecommendations();
      setRecommendations(data);
    } catch {
      setMessage({ type: 'error', text: '추천도서 목록을 불러오는 데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  // 제목+저자+출판사 입력 후 표지 자동 검색
  const searchCover = useCallback(async (title: string, author: string, publisher: string) => {
    if (!title.trim()) return;
    setSearchingCover(true);
    try {
      const url = await adminApi.searchBookCover(
        title.trim(),
        author.trim() || undefined,
        publisher.trim() || undefined,
      );
      if (url) {
        setForm((prev) => ({ ...prev, coverImageUrl: url }));
      }
    } finally {
      setSearchingCover(false);
    }
  }, []);

  // 제목, 저자, 출판사 blur 시 표지 자동 검색
  const handleFieldBlur = () => {
    if (form.title.trim()) {
      searchCover(form.title, form.author, form.publisher || '');
    }
  };

  const filteredRecommendations = recommendations.filter((r) => r.ageGroup === activeTab);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.author.trim()) {
      setMessage({ type: 'error', text: '제목과 저자는 필수입니다.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await adminApi.addRecommendation({
        ...form,
        coverImageUrl: form.coverImageUrl || undefined,
      });
      setMessage({ type: 'success', text: `"${form.title}" 추천도서가 등록되고 영상 생성이 요청되었습니다.` });
      setForm({
        ageGroup: form.ageGroup,
        title: '',
        author: '',
        publisher: '',
        summary: '',
        coverImageUrl: '',
        category: '',
      });
      await loadRecommendations();
    } catch {
      setMessage({ type: 'error', text: '추천도서 등록에 실패했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    setMessage(null);
    try {
      await adminApi.deleteRecommendation(id);
      setMessage({ type: 'success', text: '추천도서가 삭제되었습니다.' });
      await loadRecommendations();
    } catch {
      setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-1 gap-4 overflow-hidden px-4 py-4">
        {/* 좌측: 연령별 탭 + 추천도서 리스트 */}
        <div
          className="flex w-1/2 flex-col rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          {/* 연령 탭 */}
          <div className="flex shrink-0 border-b border-gray-200">
            {(Object.keys(AGE_GROUP_LABELS) as AgeGroup[]).map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveTab(group)}
                className="flex-1 px-3 py-3 text-sm font-semibold transition"
                style={{
                  borderBottom: activeTab === group ? '3px solid #2D3748' : '3px solid transparent',
                  color: activeTab === group ? '#2D3748' : '#999',
                }}
              >
                {AGE_GROUP_LABELS[group]}
                <span className="ml-1 text-xs text-gray-400">
                  ({recommendations.filter((r) => r.ageGroup === group).length})
                </span>
              </button>
            ))}
          </div>

          {/* 추천도서 리스트 */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-400">불러오는 중...</p>
              </div>
            ) : filteredRecommendations.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-400">
                  {AGE_GROUP_LABELS[activeTab]} 등록된 추천도서가 없습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
                  >
                    {/* 표지 */}
                    <div
                      className="h-14 w-10 shrink-0 rounded-lg"
                      style={{
                        background: rec.coverImageUrl
                          ? `url(${rec.coverImageUrl}) center/cover no-repeat`
                          : '#E0E0E0',
                      }}
                    />
                    {/* 정보 */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-800">{rec.title}</p>
                      <p className="truncate text-xs text-gray-500">{rec.author}</p>
                      {rec.publisher && (
                        <p className="truncate text-xs text-gray-400">{rec.publisher}</p>
                      )}
                    </div>
                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleDelete(rec.id)}
                      disabled={deleting === rec.id}
                      className="shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deleting === rec.id ? '삭제중...' : '삭제'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 도서 직접 입력 폼 */}
        <div
          className="flex w-1/2 flex-col rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <div className="shrink-0 border-b border-gray-200 px-4 py-3">
            <h2 className="text-base font-bold text-gray-800">도서 직접 입력</h2>
            <p className="mt-1 text-xs text-gray-500">
              제목과 저자를 입력하면 표지를 자동으로 검색합니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-auto p-4">
            <div className="space-y-3">
              {/* 연령 선택 */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">연령 그룹</label>
                <select
                  value={form.ageGroup}
                  onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-gray-400 focus:bg-white"
                >
                  <option value="preschool">4-6세 (유아)</option>
                  <option value="elementary">7-9세 (초등 저학년)</option>
                  <option value="teen">10-13세 (초등 고학년)</option>
                </select>
              </div>

              {/* 제목 */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  onBlur={handleFieldBlur}
                  placeholder="도서 제목"
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-gray-400 focus:bg-white"
                  required
                />
              </div>

              {/* 저자 */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  저자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  onBlur={handleFieldBlur}
                  placeholder="저자명"
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-gray-400 focus:bg-white"
                  required
                />
              </div>

              {/* 출판사 */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">출판사</label>
                <input
                  type="text"
                  value={form.publisher}
                  onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                  onBlur={handleFieldBlur}
                  placeholder="출판사 (선택)"
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-gray-400 focus:bg-white"
                />
              </div>

              {/* 요약 */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">요약</label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="도서 요약 (선택)"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:bg-white"
                />
              </div>

              {/* 카테고리 */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">카테고리</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="카테고리 (선택)"
                  className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-gray-400 focus:bg-white"
                />
              </div>

              {/* 표지 이미지 */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600">표지 이미지</label>
                  <button
                    type="button"
                    disabled={!form.title.trim() || searchingCover}
                    onClick={() => searchCover(form.title, form.author, form.publisher || '')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                  >
                    {searchingCover ? '검색중...' : '표지 검색'}
                  </button>
                </div>
                <input
                  type="url"
                  value={form.coverImageUrl}
                  onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                  placeholder="자동 검색 또는 직접 URL 입력"
                  className="mb-2 h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-gray-400 focus:bg-white"
                />
                {form.coverImageUrl && (
                  <div className="flex justify-center">
                    <img
                      src={form.coverImageUrl}
                      alt="표지 미리보기"
                      className="h-48 w-auto rounded-lg border border-gray-200 object-contain shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 메시지 */}
            {message && (
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* 등록 버튼 */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 h-12 w-full shrink-0 rounded-xl bg-blue-600 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? '등록 중...' : '추천도서 등록'}
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
