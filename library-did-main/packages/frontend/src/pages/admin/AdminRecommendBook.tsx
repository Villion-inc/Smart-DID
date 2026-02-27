import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { searchBooksWithVideo } from '../../api/did.api';
import { useAdminStore } from '../../stores/adminStore';
import type { SearchResultWithVideo } from '../../api/did.api';

/**
 * 추천 도서 등록 - ALPAS에서 검색하여 영상 생성 요청
 */
export function AdminRecommendBook() {
  const { requestVideoGeneration } = useAdminStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultWithVideo[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setMessage(null);
    try {
      const results = await searchBooksWithVideo(searchQuery.trim(), 10);
      setSearchResults(results);
      if (results.length === 0) {
        setMessage({ type: 'error', text: '검색 결과가 없습니다.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '검색 중 오류가 발생했습니다.' });
    } finally {
      setSearching(false);
    }
  };

  const handleRequestVideo = async (book: SearchResultWithVideo) => {
    setSubmitting(book.id);
    setMessage(null);
    try {
      // 책 정보를 함께 전달하여 캐시 미스 시에도 정확한 정보 사용
      await requestVideoGeneration(book.id, {
        title: book.title,
        author: book.author,
      });
      setMessage({ type: 'success', text: `"${book.title}" 영상 생성 요청 완료!` });
      // 검색 결과 업데이트
      setSearchResults((prev) =>
        prev.map((b) =>
          b.id === book.id ? { ...b, videoStatus: 'QUEUED', hasVideo: false } : b
        )
      );
    } catch (err) {
      setMessage({ type: 'error', text: '영상 생성 요청에 실패했습니다.' });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <AdminLayout title="도서 등록">
      <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 py-4">
        {/* 검색 */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <h2 className="mb-3 text-base font-bold text-gray-800">
            도서 검색
          </h2>
          <p className="mb-3 text-sm text-gray-500">
            ALPAS에서 도서를 검색하여 영상 생성을 요청하세요.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="도서 제목 검색"
              className="h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm outline-none focus:border-gray-400 focus:bg-white"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="h-11 shrink-0 rounded-xl bg-gray-800 px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              {searching ? '검색중...' : '검색'}
            </button>
          </div>
        </div>

        {/* 메시지 */}
        {message && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 검색 결과 */}
        {searchResults.length > 0 && (
          <div
            className="flex-1 rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.9)' }}
          >
            <h2 className="mb-3 text-base font-bold text-gray-800">
              검색 결과 ({searchResults.length}건)
            </h2>
            <div className="space-y-2">
              {searchResults.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
                >
                  {/* 표지 */}
                  <div
                    className="h-16 w-12 shrink-0 rounded-lg"
                    style={{
                      background: book.coverImageUrl
                        ? `url(${book.coverImageUrl}) center/cover no-repeat`
                        : '#E0E0E0',
                    }}
                  />
                  {/* 정보 */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-800">
                      {book.title}
                    </p>
                    <p className="truncate text-xs text-gray-500">{book.author}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {book.hasVideo ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          영상 있음
                        </span>
                      ) : book.videoStatus === 'QUEUED' || book.videoStatus === 'GENERATING' ? (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                          {book.videoStatus === 'QUEUED' ? '대기중' : '생성중'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          영상 없음
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 버튼 */}
                  <button
                    type="button"
                    onClick={() => handleRequestVideo(book)}
                    disabled={submitting === book.id || book.hasVideo || book.videoStatus === 'QUEUED' || book.videoStatus === 'GENERATING'}
                    className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {submitting === book.id ? '요청중...' : book.hasVideo ? '완료' : '영상 생성'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 안내 */}
        {searchResults.length === 0 && !searching && (
          <div
            className="flex flex-1 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.9)' }}
          >
            <p className="text-sm text-gray-400">
              도서를 검색하여 영상 생성을 요청하세요.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
