import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * 관리자 로그인 페이지 - DID 스타일과 통일
 */
export const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || '로그인에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="relative mx-auto flex flex-col overflow-hidden"
      style={{
        width: 450,
        height: 780,
        fontFamily: 'Pretendard, sans-serif',
        background: 'linear-gradient(180deg, #F0F4F8 0%, #E8ECF0 100%)',
      }}
    >
      {/* Header */}
      <header
        className="flex h-14 w-full shrink-0 items-center justify-center"
        style={{ background: 'rgba(45, 55, 72, 0.95)' }}
      >
        <h1 className="text-lg font-bold text-white">BookMate 관리자</h1>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div
          className="w-full rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.9)' }}
        >
          <div className="mb-6 text-center">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: 'rgba(45, 55, 72, 0.1)' }}
            >
              <svg
                className="h-8 w-8 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800">관리자 로그인</h2>
            <p className="mt-1 text-sm text-gray-500">
              도서관 영상 관리 시스템
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                사용자명
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                autoFocus
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base outline-none focus:border-gray-400 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-base outline-none focus:border-gray-400 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center rounded-xl text-base font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
              style={{ background: '#2D3748' }}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            기본 계정: admin / changeme123
          </p>
        </div>
      </main>
    </div>
  );
};
