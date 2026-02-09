import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { VideoStatusBadge } from '../../components/VideoStatusBadge';
import { Button } from '../../components/Button';
import { Loading } from '../../components/Loading';
import { VideoStatus } from '../../types';
import { ArrowLeft, Calendar } from 'lucide-react';

export const VideoManagement: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { videos, isLoading, loadVideos } = useAdminStore();
  const [statusFilter, setStatusFilter] = useState<VideoStatus | undefined>(undefined);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }

    loadVideos(statusFilter);
  }, [isAuthenticated, statusFilter]);

  const statusOptions: { label: string; value: VideoStatus | undefined }[] = [
    { label: '전체', value: undefined },
    { label: '준비완료', value: 'READY' },
    { label: '대기중', value: 'QUEUED' },
    { label: '생성중', value: 'GENERATING' },
    { label: '실패', value: 'FAILED' },
    { label: '없음', value: 'NONE' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
                <ArrowLeft className="w-5 h-5 mr-2" />
                대시보드
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">영상 관리</h1>
                <p className="text-sm text-gray-600">전체 영상 상태 및 관리</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">상태 필터:</span>
            <div className="flex gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Videos Table */}
        {isLoading ? (
          <Loading text="영상 목록을 불러오는 중..." />
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      도서 ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      요청 횟수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      랭킹 점수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      마지막 요청
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      만료일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {videos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        영상 기록이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    videos.map((video) => (
                      <tr key={video.bookId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/books/${video.bookId}`)}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                          >
                            {video.bookId}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <VideoStatusBadge status={video.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {video.requestCount}회
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {video.rankingScore.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {video.lastRequestedAt
                            ? new Date(video.lastRequestedAt).toLocaleString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {video.expiresAt
                            ? new Date(video.expiresAt).toLocaleDateString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {video.status === 'READY' && video.videoUrl && (
                            <a
                              href={video.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-800"
                            >
                              영상 보기
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            {videos.length > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  총 <span className="font-semibold text-gray-900">{videos.length}</span>개의 영상 기록
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
