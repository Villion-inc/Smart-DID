import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAdminStore } from '../../stores/adminStore';
import { adminApi, WaitingJob } from '../../api/admin.api';
import { VideoStatus } from '../../types';
import { AdminLayout } from './AdminLayout';

const STATUS_COLORS: Record<VideoStatus, { bg: string; text: string; label: string }> = {
  READY: { bg: 'bg-green-100', text: 'text-green-700', label: '완료' },
  QUEUED: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '대기' },
  GENERATING: { bg: 'bg-blue-100', text: 'text-blue-700', label: '생성중' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: '실패' },
  NONE: { bg: 'bg-gray-100', text: 'text-gray-600', label: '없음' },
};

export const VideoManagement: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { videos, isLoading, loadVideos } = useAdminStore();
  const [statusFilter, setStatusFilter] = useState<VideoStatus | undefined>(undefined);
  const [waitingJobs, setWaitingJobs] = useState<WaitingJob[]>([]);
  const [showQueue, setShowQueue] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
      return;
    }
    loadVideos(statusFilter);
    loadWaitingJobs();
  }, [isAuthenticated, statusFilter]);

  const loadWaitingJobs = async () => {
    try {
      const jobs = await adminApi.getWaitingJobs(50);
      setWaitingJobs(jobs);
    } catch (error) {
      console.error('Failed to load waiting jobs:', error);
    }
  };

  const handleCancelJob = async (bookId: string) => {
    if (!confirm('이 영상 생성 요청을 취소하시겠습니까?')) return;
    setCancellingId(bookId);
    try {
      await adminApi.cancelJob(bookId);
      await loadWaitingJobs();
      await loadVideos(statusFilter);
    } catch (error) {
      console.error('Failed to cancel job:', error);
      alert('취소에 실패했습니다.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleRetryJob = async (bookId: string) => {
    setRetryingId(bookId);
    try {
      await adminApi.retryFailedJob(bookId);
      await loadVideos(statusFilter);
    } catch (error) {
      console.error('Failed to retry job:', error);
      alert('재시도에 실패했습니다.');
    } finally {
      setRetryingId(null);
    }
  };

  const statusOptions: { label: string; value: VideoStatus | undefined }[] = [
    { label: '전체', value: undefined },
    { label: '완료', value: 'READY' },
    { label: '대기', value: 'QUEUED' },
    { label: '생성중', value: 'GENERATING' },
    { label: '실패', value: 'FAILED' },
  ];

  return (
    <AdminLayout title="영상 관리">
      <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 py-4">
        {/* 탭 전환 */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowQueue(false)}
            className="flex-1 rounded-xl px-4 py-2 text-sm font-medium transition"
            style={{
              background: !showQueue ? '#2D3748' : 'rgba(255,255,255,0.9)',
              color: !showQueue ? '#fff' : '#666',
            }}
          >
            영상 목록
          </button>
          <button
            onClick={() => setShowQueue(true)}
            className="flex-1 rounded-xl px-4 py-2 text-sm font-medium transition"
            style={{
              background: showQueue ? '#2D3748' : 'rgba(255,255,255,0.9)',
              color: showQueue ? '#fff' : '#666',
            }}
          >
            대기열 ({waitingJobs.length})
          </button>
        </div>

        {showQueue ? (
          /* 대기열 관리 */
          <div className="space-y-3">
            {waitingJobs.length === 0 ? (
              <div
                className="flex flex-1 items-center justify-center rounded-2xl p-8"
                style={{ background: 'rgba(255,255,255,0.9)' }}
              >
                <p className="text-sm text-gray-500">대기 중인 작업이 없습니다.</p>
              </div>
            ) : (
              <>
                {waitingJobs.map((job) => (
                  <div
                    key={job.jobId}
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.9)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-800">
                          {job.title || job.bookId}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>우선순위: {job.priority}</span>
                          <span>
                            등록: {new Date(job.addedAt).toLocaleString('ko-KR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelJob(job.bookId)}
                        disabled={cancellingId === job.bookId}
                        className="shrink-0 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                      >
                        {cancellingId === job.bookId ? '취소중...' : '취소'}
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-center text-xs text-gray-400">
                  총 {waitingJobs.length}개의 대기 작업
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* 필터 버튼 */}
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setStatusFilter(option.value)}
                  className="rounded-xl px-4 py-2 text-sm font-medium transition"
                  style={{
                    background:
                      statusFilter === option.value ? '#2D3748' : 'rgba(255,255,255,0.9)',
                    color: statusFilter === option.value ? '#fff' : '#666',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

        {/* 영상 목록 */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-gray-500">불러오는 중...</p>
          </div>
        ) : videos.length === 0 ? (
          <div
            className="flex flex-1 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.9)' }}
          >
            <p className="text-sm text-gray-500">영상 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video) => {
              const statusStyle = STATUS_COLORS[video.status] || STATUS_COLORS.NONE;
              return (
                <div
                  key={video.bookId}
                  className="rounded-2xl p-4"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-800">
                        {video.bookId}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>요청 {video.requestCount ?? 0}회</span>
                        <span>랭킹 {(video.rankingScore ?? 0).toFixed(1)}</span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                    >
                      {statusStyle.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {video.lastRequestedAt
                        ? new Date(video.lastRequestedAt).toLocaleString('ko-KR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '-'}
                    </span>
                    <div className="flex gap-2">
                      {/* QUEUED 상태: 취소 버튼 */}
                      {video.status === 'QUEUED' && (
                        <button
                          type="button"
                          onClick={() => handleCancelJob(video.bookId)}
                          disabled={cancellingId === video.bookId}
                          className="text-red-600 underline disabled:opacity-50"
                        >
                          {cancellingId === video.bookId ? '취소중...' : '취소'}
                        </button>
                      )}
                      {/* FAILED 상태: 재시도 버튼 */}
                      {video.status === 'FAILED' && (
                        <button
                          type="button"
                          onClick={() => handleRetryJob(video.bookId)}
                          disabled={retryingId === video.bookId}
                          className="text-orange-600 underline disabled:opacity-50"
                        >
                          {retryingId === video.bookId ? '재시도중...' : '재시도'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/did/video/${video.bookId}`)}
                        className="text-blue-600 underline"
                      >
                        DID에서 보기
                      </button>
                      {video.status === 'READY' && video.videoUrl && (
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 underline"
                        >
                          영상 열기
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="text-center text-xs text-gray-400">
              총 {videos.length}개의 영상 기록
            </p>
          </div>
        )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};
