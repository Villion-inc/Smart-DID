/**
 * 정보나루 API + 서비스 테스트
 * 실행: npx tsx packages/backend/scripts/test-data4library.ts
 */

// config를 먼저 로드해야 서비스가 키를 읽음
import '../src/config';
import { data4libraryService } from '../src/services/data4library.service';

async function main() {
  console.log('=== 정보나루 서비스 테스트 ===\n');
  console.log(`설정 여부: ${data4libraryService.isConfigured()}`);

  // 1. 연령별 인기도서 (중복 제거 후 10권)
  for (const group of ['preschool', 'elementary', 'teen'] as const) {
    const label = { preschool: '유아', elementary: '초등', teen: '청소년' }[group];
    console.log(`\n--- ${label} 인기도서 (중복 제거 후 10권) ---`);

    const books = await data4libraryService.getPopularByAgeGroup(group, 10);
    books.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.bookname}`);
      console.log(`     저자: ${b.authors} | 표지: ${b.bookImageURL ? 'O' : 'X'} | 대출: ${b.loan_count}`);
    });
    console.log(`  => 총 ${books.length}권`);
  }

  // 2. 도서 상세 (줄거리 확인)
  const elementary = await data4libraryService.getPopularByAgeGroup('elementary', 1);
  if (elementary.length > 0 && elementary[0].isbn13) {
    console.log(`\n--- 도서 상세: ${elementary[0].bookname} ---`);
    const detail = await data4libraryService.getBookDetail(elementary[0].isbn13);
    if (detail) {
      console.log(`  줄거리: ${detail.description.substring(0, 150)}...`);
      console.log(`  표지: ${detail.bookImageURL}`);
    }
  }

  console.log('\n테스트 완료');
}

main().catch(console.error);
