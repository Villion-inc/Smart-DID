import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { VideoStatusBadge } from '../../components/VideoStatusBadge';
import { Loading } from '../../components/Loading';
import { VideoStatus } from '../../types';
import { AdminLayout } from './AdminLayout';

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
    { label: '대기', value: 'QUEUED' },
    { label: '생성중', value: 'GENERATING' },
    { label: '실패', value: 'FAILED' },
    { label: '없음', value: 'NONE' },
  ];

  return (
    <AdminLayout title="영상 관리">
      <div className="px-5 pb-8 pt-6" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        <div className="mb-4 flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.label}
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-[30px] border px-3 py-2 text-sm font-medium ${
                statusFilter === option.value
                  ? 'border-black bg-black text-white'
                  : 'border-[#E8E8E8] bg-[#FAF9F9] text-black'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Loading text="영상 목록을 불러오는 중..." />
        ) : (
          <div className="space-y-3">
            {videos.length === 0 ? (
              <div className="rounded-[30px] border border-[#DBDBDB] bg-[#FAF9F9] p-6 text-center text-black">
                영상 기록이 없습니다.
              </div>
            ) : (
              videos.map((video) => (
                <div
                  key={video.bookId}
                  className="rounded-[30px] border border-[#DBDBDB] bg-[#FAF9F9] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{video.bookId}</span>
                    <VideoStatusBadge status={video.status} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-gray-600">
                    <span>요청 {video.requestCount ?? 0}회</span>
                    <span>랭킹 {(video.rankingScore ?? 0).toFixed(1)}</span>
                    <span>
                      {video.lastRequestedAt
                        ? new Date(video.lastRequestedAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
                        : '-'}
                    </span>
                    <span>{video.expiresAt ? new Date(video.expiresAt).toLocaleDateString('ko-KR') : '-'}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/books/${video.bookId}`)}
                      className="text-sm font-medium text-black underline"
                    >
                      도서 보기
                    </button>
                    {video.status === 'READY' && video.videoUrl && (
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-black underline"
                      >
                        영상 보기
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
            {videos.length > 0 && (
              <p className="text-center text-sm text-gray-600">
                총 {videos.length}개의 영상 기록
              </p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
