import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminLayout';
import { adminApi, RecommendationData } from '../../api/admin.api';
import { searchBooksWithVideo } from '../../api/did.api';
import type { DidBook } from '../../types';

type AgeGroup = 'preschool' | 'elementary' | 'teen';

const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  preschool: '4-6세',
  elementary: '7-9세',
  teen: '10-13세',
};

/**
 * 추천 도서 등록 — ALPAS 검색 → 선택 → 등록
 * 상단: 연령 탭 + 검색바
 * 하단: 검색 결과 (등록 버튼) + 등록된 도서 표시
 */
export function AdminRecommendBook() {
  const [activeTab, setActiveTab] = useState<AgeGroup>('preschool');
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);
  const [, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DidBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setMessage(null);
    try {
      const results = await searchBooksWithVideo(searchQuery.trim(), 20);
      setSearchResults(results);
      if (results.length === 0) {
        setMessage({ type: 'error', text: '검색 결과가 없습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: '검색에 실패했습니다.' });
    } finally {
      setSearching(false);
    }
  };

  const handleRegister = async (book: DidBook) => {
    setSubmitting(book.id);
    setMessage(null);
    try {
      await adminApi.addRecommendation({
        bookId: book.id,
        ageGroup: activeTab,
        title: book.title,
        author: book.author,
        publisher: '',
        summary: '',
        coverImageUrl: book.coverImageUrl,
        category: book.category || '',
      });
      setMessage({ type: 'success', text: `"${book.title}" → ${AGE_GROUP_LABELS[activeTab]} 등록 완료` });
      await loadRecommendations();
    } catch {
      setMessage({ type: 'error', text: '등록에 실패했습니다.' });
    } finally {
      setSubmitting(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    setMessage(null);
    try {
      await adminApi.deleteRecommendation(id);
      setMessage({ type: 'success', text: '삭제되었습니다.' });
      await loadRecommendations();
    } catch {
      setMessage({ type: 'error', text: '삭제에 실패했습니다.' });
    } finally {
      setDeleting(null);
    }
  };

  const registeredBookIds = new Set(recommendations.map((r) => r.bookId));
  const filteredRecommendations = recommendations.filter((r) => r.ageGroup === activeTab);

  return (
    <AdminLayout>
      <div className="flex flex-1 flex-col overflow-hidden px-4 py-4">
        <div
          className="flex flex-1 flex-col overflow-hidden rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          {/* 상단: 연령 탭 */}
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

          {/* 검색바 */}
          <form onSubmit={handleSearch} className="flex shrink-0 gap-2 px-3 py-3 border-b border-gray-100">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목 또는 저자 검색 (ALPAS)"
              className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm outline-none focus:border-gray-400 focus:bg-white"
            />
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              className="h-10 shrink-0 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {searching ? '...' : '검색'}
            </button>
          </form>

          {/* 메시지 */}
          {message && (
            <div
              className={`mx-3 mt-2 rounded-lg px-3 py-2 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-auto p-3">
            {/* 등록된 추천도서 (해당 연령) */}
            {filteredRecommendations.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-gray-500">
                  {AGE_GROUP_LABELS[activeTab]} 등록 도서 ({filteredRecommendations.length})
                </p>
                <div className="space-y-1.5">
                  {filteredRecommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center gap-2 rounded-xl bg-blue-50 p-2.5"
                    >
                      <div
                        className="h-12 w-8 shrink-0 rounded-lg"
                        style={{
                          background: rec.coverImageUrl
                            ? `url(${rec.coverImageUrl}) center/cover no-repeat`
                            : '#E0E0E0',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-800">{rec.title}</p>
                        <p className="truncate text-xs text-gray-500">{rec.author}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(rec.id)}
                        disabled={deleting === rec.id}
                        className="shrink-0 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deleting === rec.id ? '...' : '삭제'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-500">
                  검색 결과 ({searchResults.length})
                </p>
                <div className="space-y-1.5">
                  {searchResults.map((book) => {
                    const alreadyRegistered = registeredBookIds.has(book.id);
                    return (
                      <div
                        key={book.id}
                        className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5"
                      >
                        <div
                          className="h-12 w-8 shrink-0 rounded-lg"
                          style={{
                            background: book.coverImageUrl
                              ? `url(${book.coverImageUrl}) center/cover no-repeat`
                              : '#E0E0E0',
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-gray-800">{book.title}</p>
                          <p className="truncate text-xs text-gray-500">{book.author}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRegister(book)}
                          disabled={alreadyRegistered || submitting === book.id}
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                            alreadyRegistered
                              ? 'bg-gray-200 text-gray-400'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          } disabled:opacity-50`}
                        >
                          {alreadyRegistered
                            ? '등록됨'
                            : submitting === book.id
                              ? '...'
                              : `${AGE_GROUP_LABELS[activeTab]} 등록`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 빈 상태 */}
            {searchResults.length === 0 && filteredRecommendations.length === 0 && !searching && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-gray-400">도서를 검색하여 추천도서로 등록하세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
