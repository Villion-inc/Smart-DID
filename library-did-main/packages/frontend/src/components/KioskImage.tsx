/**
 * 키오스크 디자인 시안 기준 플레이스홀더 (이미지 없이 크기·비율만 적용)
 * - image1: 424×729
 * - image2: 401×713
 * - image4: 449×778
 * - image5: 454×780
 */
interface KioskImageProps {
  variant: 'image1' | 'image2' | 'image4' | 'image5';
  className?: string;
  /** 480px 뷰포트에서 꽉 채우려면 true */
  responsive?: boolean;
}

const SIZES = {
  image1: { width: 424, height: 729 },
  image2: { width: 401, height: 713 },
  image4: { width: 449, height: 778 },
  image5: { width: 454, height: 780 },
};

export function KioskImage({ variant, className = '', responsive = true }: KioskImageProps) {
  const { width, height } = SIZES[variant];
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: responsive ? '100%' : width,
        maxWidth: width,
        aspectRatio: `${width} / ${height}`,
        backgroundColor: 'rgba(184, 230, 245, 0.4)',
      }}
      aria-hidden
    />
  );
}
