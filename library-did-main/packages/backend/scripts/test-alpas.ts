/**
 * ALPAS Real API 테스트 스크립트
 * packages/backend 폴더에서: npx tsx scripts/test-alpas.ts
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const ALPAS_API_URL = process.env.ALPAS_API_URL || '';
const ALPAS_API_KEY = process.env.ALPAS_API_KEY || '';

/** ALPAS 서버 연결 가능 여부를 짧은 타임아웃으로 확인 */
async function canReachAlpas(): Promise<boolean> {
  if (!ALPAS_API_URL) return false;
  try {
    const url = ALPAS_API_URL.replace(/\/$/, '') + '/AE117.do';
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('ALPAS env check:', {
    ALPAS_API_URL: ALPAS_API_URL ? `${ALPAS_API_URL.slice(0, 40)}...` : '(empty)',
    ALPAS_API_KEY: ALPAS_API_KEY ? '***set***' : '(empty)',
  });

  if (!ALPAS_API_URL && !ALPAS_API_KEY) {
    console.log('\nALPAS_API_URL 또는 ALPAS_API_KEY가 없어 Mock이 사용됩니다. .env 확인 후 백엔드 재시작하세요.');
    process.exit(0);
  }

  console.log('\n[연결 확인] ALPAS 서버 접근 가능 여부 확인 중 (약 4초)...');
  const reachable = await canReachAlpas();
  if (!reachable) {
    console.log(
      '\n❌ ALPAS 서버(' +
        ALPAS_API_URL.slice(0, 50) +
        '...)에 연결할 수 없습니다.\n' +
        '   → 10.10.x.x 는 사내망/전용망 IP라, 해당 네트워크(VPN 또는 사내 LAN)에 연결된 PC에서만 접근 가능합니다.\n' +
        '   → 테스트용 공개 서버로 시도: .env에 ALPAS_API_URL=http://www.alpas.kr/BTLMS/HOMEPAGE/API 로 설정 후 다시 실행해 보세요.\n'
    );
    process.exit(1);
  }
  console.log('   서버 연결 가능.\n');

  const { alpasRealService } = await import('../src/services/alpas-real.service');

  console.log('1) getNewArrivals() [AE117 특정기간 신착] (timeout 30s)');
  try {
    const arrivals = await alpasRealService.getNewArrivals();
    console.log('   결과 개수:', arrivals.length);
    if (arrivals.length > 0) {
      console.log('   첫 항목:', JSON.stringify(arrivals[0], null, 2).slice(0, 400) + '...');
    }
  } catch (e: any) {
    console.log('   에러:', e.message);
    if (e.response) console.log('   HTTP 상태:', e.response.status, e.response.data);
  }

  console.log('\n2) searchBooks("책") [AD201 제목검색] (timeout 30s)');
  try {
    const books = await alpasRealService.searchBooks('책');
    console.log('   결과 개수:', books.length);
    if (books.length > 0) {
      console.log('   첫 항목 제목:', books[0].title);
    }
  } catch (e: any) {
    console.log('   에러:', e.message);
    if (e.response) console.log('   HTTP 상태:', e.response.status, e.response.data);
  }

  console.log('\n테스트 끝.');
}

main();
