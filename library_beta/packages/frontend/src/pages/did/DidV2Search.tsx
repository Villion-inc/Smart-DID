import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { searchBooksWithVideo } from '../../api/did.api';
import type { SearchResultWithVideo } from '../../api/did.api';
import { DidV2Layout } from './DidV2Layout';
import { VirtualKeyboard } from '../../components/keyboard/VirtualKeyboard';
import { useHangulComposer } from '../../components/keyboard/useHangulComposer';

/**
 * 책 검색 페이지 (키오스크 세로 화면)
 * - 가상 한영 키보드 통합
 * - URL 파라미터로 검색어 유지 (뒤로가기 시 상태 복원)
 */
export function DidV2Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<SearchResultWithVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const composer = useHangulComposer();
  const [keyboardVisible, setKeyboardVisible] = useState(true);

  // URL에 검색어가 있으면 자동 검색 (뒤로가기 시 복원)
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery && urlQuery.trim()) {
      composer.setText(urlQuery);
      performSearch(urlQuery);
    }
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const list = await searchBooksWithVideo(searchQuery.trim(), 20);
      setResults(list);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    const text = composer.displayText.trim();
    if (!text) return;
    composer.commitComposing();
    setSearchParams({ q: text });
    performSearch(text);
  };

  return (
    <DidV2Layout title="책 검색" hideFooter={keyboardVisible}>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* 검색 전 초기 상태 */}
        {!searched && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <span className="mb-3 text-5xl sm:mb-4 sm:text-6xl">📚</span>
            <p className="text-lg font-semibold text-gray-700 sm:text-xl md:text-2xl">
              어떤 책을 찾고 있나요?
            </p>
            <p className="mb-4 mt-1 text-sm text-gray-500 sm:mb-6 sm:text-base">
              아래 키보드로 검색해보세요!
            </p>
            {/* 입력 표시 (터치하면 키보드 올라옴) */}
            <div
              className="w-full cursor-text rounded-2xl p-3 sm:rounded-3xl sm:p-4"
              style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
              onClick={() => setKeyboardVisible(true)}
            >
              <div
                className="flex min-h-[44px] items-center rounded-xl border-2 border-blue-200 bg-white px-4 py-3 sm:min-h-[52px] sm:px-5 sm:py-4"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              >
                <span className="flex-1 text-base sm:text-lg">
                  {composer.displayText || (
                    <span className="text-gray-400">예: 토끼, 모험</span>
                  )}
                </span>
                {keyboardVisible && (
                  <span className="ml-0.5 animate-pulse text-lg text-blue-400">|</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 검색 후: 상단 입력 표시 + 결과 목록 */}
        {(searched || loading) && (
          <>
            {/* 컴팩트 입력 표시 (터치하면 키보드 올라옴) */}
            <div
              className="mb-2 shrink-0 cursor-text rounded-2xl p-2.5 sm:mb-3 sm:p-3"
              style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
              onClick={() => setKeyboardVisible(true)}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className="flex min-h-[38px] flex-1 items-center rounded-xl border-2 border-blue-200 bg-white px-3 py-2 sm:min-h-[44px] sm:px-4 sm:py-2.5"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                >
                  <span className="flex-1 truncate text-sm sm:text-base">
                    {composer.displayText || (
                      <span className="text-gray-400">예: 토끼, 모험</span>
                    )}
                  </span>
                  {keyboardVisible && (
                    <span className="ml-0.5 animate-pulse text-base text-blue-400">|</span>
                  )}
                </div>
              </div>
            </div>

            {/* 결과 영역 */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto sm:gap-4">
              {loading && (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-base text-gray-500 sm:text-lg">🔍 찾는 중...</p>
                </div>
              )}
              {!loading && results.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center">
                  <span className="mb-2 text-4xl sm:text-5xl">🤔</span>
                  <p className="text-base text-gray-500 sm:text-lg">검색 결과가 없어요</p>
                  <p className="mt-1 text-sm text-gray-400">다른 단어로 찾아볼까요?</p>
                </div>
              )}
              {!loading &&
                results.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => navigate(`/did/video/${book.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98] sm:gap-4 sm:p-4"
                    style={{ background: 'rgba(255,255,255,0.85)' }}
                  >
                    <div
                      className="h-20 w-14 shrink-0 rounded-lg sm:h-24 sm:w-16"
                      style={{
                        background: book.coverImageUrl
                          ? `url(${book.coverImageUrl}) center/cover no-repeat`
                          : 'linear-gradient(180deg, #E8F4FC 0%, #D4EAD6 100%)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      {!book.coverImageUrl && (
                        <div className="flex h-full w-full items-center justify-center text-2xl">📚</div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-base font-bold text-gray-800 sm:text-lg">
                        {book.title}
                      </span>
                      <span className="mt-0.5 truncate text-sm text-gray-600 sm:text-base">
                        {book.author}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-2">
                        {book.category && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 sm:text-sm">
                            {book.category}
                          </span>
                        )}
                        {book.hasVideo && (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700 sm:text-sm">
                            🎬 영상있음
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xl text-gray-400 sm:text-2xl">›</span>
                  </button>
                ))}
            </div>
          </>
        )}

        {/* 가상 키보드 */}
        {keyboardVisible && (
          <div className="-mx-4 -mb-2">
            <VirtualKeyboard
              onChar={(char, isKorean) => {
                if (isKorean) composer.handleKey(char);
                else composer.addChar(char);
              }}
              onBackspace={composer.handleBackspace}
              onSpace={composer.handleSpace}
              onSearch={handleSearch}
              onLangChange={composer.commitComposing}
              onDismiss={() => setKeyboardVisible(false)}
            />
          </div>
        )}
      </div>
    </DidV2Layout>
  );
}
