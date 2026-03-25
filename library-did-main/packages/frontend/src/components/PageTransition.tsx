import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    // 페이지 변경 시 fade out → 새 컨텐츠 → fade in
    setVisible(false);
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setVisible(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 150ms ease-in-out',
        height: '100%',
      }}
    >
      {displayChildren}
    </div>
  );
}
