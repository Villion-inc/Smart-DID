import React from 'react';
import { Badge } from './Badge';
import { VideoStatus } from '../types';

interface VideoStatusBadgeProps {
  status: VideoStatus;
}

export const VideoStatusBadge: React.FC<VideoStatusBadgeProps> = ({ status }) => {
  const config = {
    NONE: { variant: 'default' as const, text: '영상 없음' },
    QUEUED: { variant: 'info' as const, text: '대기중' },
    GENERATING: { variant: 'warning' as const, text: '생성중' },
    READY: { variant: 'success' as const, text: '준비완료' },
    FAILED: { variant: 'danger' as const, text: '실패' },
  };

  const { variant, text } = config[status];

  return <Badge variant={variant}>{text}</Badge>;
};
