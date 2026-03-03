import { useEffect, useRef } from 'react';

const CHECK_INTERVAL = 60 * 60 * 1000; // 1시간

/**
 * 자동 새로고침 훅
 * - 1시간마다 index.html을 가져와 빌드 해시(script src) 비교
 * - 새 버전이 배포되면 자동으로 location.reload()
 */
export function useAutoRefresh() {
  const initialHash = useRef<string | null>(null);

  useEffect(() => {
    const extractScriptHash = (html: string): string => {
      const matches = html.match(/<script[^>]+src="[^"]+"/g);
      return matches ? matches.sort().join('') : '';
    };

    const checkForUpdate = async () => {
      try {
        const res = await fetch(`/?_t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const html = await res.text();
        const hash = extractScriptHash(html);

        if (!initialHash.current) {
          initialHash.current = hash;
          return;
        }

        if (hash !== initialHash.current) {
          console.log('[AutoRefresh] New version detected, reloading...');
          window.location.reload();
        }
      } catch {
        // 네트워크 오류 시 무시 — 다음 주기에 재시도
      }
    };

    // 초기 해시 저장
    checkForUpdate();

    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);
}
