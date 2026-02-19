import { queueService } from './queue.service';
import { alpasService } from './alpas.service';
import { videoRepository } from '../repositories/video.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { Book } from '../types';

/**
 * Bestseller Seed Service
 * - 베스트셀러 100권 사전 영상 생성
 * - 초기 시드 데이터 생성
 * - 관리자가 수동으로 실행 가능
 */
export class BestsellerSeedService {
  // 사전 생성할 베스트셀러 목록 (하드코딩된 인기 도서 키워드)
  private readonly BESTSELLER_KEYWORDS = [
    // 유아 추천 (그림책)
    '아기 돼지', '뽀로로', '핑크퐁', '무지개 물고기', '구름빵',
    '강아지똥', '곰 사냥', '배고픈 애벌레', '달님 안녕', '고마운 친구',
    // 아동 추천 (초등)
    '마법천자문', '그리스 로마 신화', '도라에몽', '설민석', '흔한남매',
    '코딩', '과학 실험', '수학 동화', '한국사', '세계사',
    '원피스', '포켓몬', '마인크래프트', '명탐정 코난', '짱구',
    // 청소년 추천
    '어린왕자', '해리포터', '나미야 잡화점', '아몬드', '달러구트',
    '이상한 나라', '모모', '호빗', '반지의 제왕', '나니아',
    // 일반 인기 도서
    '작은 아씨들', '빨간 머리 앤', '셜록 홈즈', '삼국지', '수호지',
    '돈키호테', '로빈슨 크루소', '걸리버 여행기', '톰 소여', '보물섬',
  ];

  /**
   * 베스트셀러 시드 실행
   * @param limit 생성할 최대 개수 (기본 100)
   */
  async seedBestsellers(limit: number = 100): Promise<{
    requested: number;
    skipped: number;
    failed: number;
    details: Array<{ title: string; status: string }>;
  }> {
    console.log(`[BestsellerSeed] Starting seed process for ${limit} bestsellers`);

    const details: Array<{ title: string; status: string }> = [];
    let requested = 0;
    let skipped = 0;
    let failed = 0;

    const books: Book[] = [];

    // 1. 키워드별로 책 검색하여 수집
    for (const keyword of this.BESTSELLER_KEYWORDS) {
      if (books.length >= limit) break;

      try {
        const searchResults = await alpasService.searchBooks(keyword);
        for (const book of searchResults) {
          if (books.length >= limit) break;
          // 중복 제거
          if (!books.find((b) => b.id === book.id)) {
            books.push(book);
          }
        }
      } catch (error) {
        console.error(`[BestsellerSeed] Error searching for "${keyword}":`, error);
      }
    }

    console.log(`[BestsellerSeed] Found ${books.length} unique books`);

    // 2. 각 책에 대해 영상 생성 요청
    for (const book of books) {
      try {
        // 이미 영상이 있는지 확인
        const existingRecord = await videoRepository.findByBookId(book.id);
        if (existingRecord && existingRecord.status === 'READY') {
          skipped++;
          details.push({ title: book.title, status: 'already_exists' });
          continue;
        }

        // 큐에 추가
        const job = await queueService.addVideoJob(
          {
            bookId: book.id,
            title: book.title,
            author: book.author,
            summary: book.summary || '',
            trigger: 'admin_seed',
          },
          20 // 낮은 우선순위
        );

        if (job) {
          requested++;
          details.push({ title: book.title, status: 'queued' });
        } else {
          skipped++;
          details.push({ title: book.title, status: 'skipped_duplicate' });
        }
      } catch (error) {
        failed++;
        details.push({ title: book.title, status: 'error' });
        console.error(`[BestsellerSeed] Error processing "${book.title}":`, error);
      }
    }

    // 3. 알림 생성
    await notificationRepository.create({
      type: 'bestseller_seed_complete',
      message: `베스트셀러 시드 완료: ${requested}권 요청, ${skipped}권 스킵, ${failed}권 실패`,
    });

    console.log(`[BestsellerSeed] Seed complete: ${requested} requested, ${skipped} skipped, ${failed} failed`);

    return { requested, skipped, failed, details };
  }

  /**
   * 연령대별 추천 도서 시드
   */
  async seedByAgeGroup(
    ageGroup: 'preschool' | 'elementary' | 'teen',
    limit: number = 30
  ): Promise<{
    requested: number;
    skipped: number;
  }> {
    console.log(`[BestsellerSeed] Seeding ${ageGroup} books (limit: ${limit})`);

    const books = await alpasService.getBooksByAgeGroup(ageGroup);
    let requested = 0;
    let skipped = 0;

    for (const book of books.slice(0, limit)) {
      const job = await queueService.addVideoJob(
        {
          bookId: book.id,
          title: book.title,
          author: book.author,
          summary: book.summary || '',
          trigger: 'admin_seed',
        },
        15 // 중간 우선순위
      );

      if (job) {
        requested++;
      } else {
        skipped++;
      }
    }

    return { requested, skipped };
  }

  /**
   * 특정 책 목록으로 시드
   */
  async seedFromList(
    bookIds: string[],
    priority: number = 10
  ): Promise<{
    requested: number;
    skipped: number;
    notFound: number;
  }> {
    let requested = 0;
    let skipped = 0;
    let notFound = 0;

    for (const bookId of bookIds) {
      const book = await alpasService.getBookDetail(bookId);

      if (!book) {
        notFound++;
        continue;
      }

      const job = await queueService.addVideoJob(
        {
          bookId: book.id,
          title: book.title,
          author: book.author,
          summary: book.summary || '',
          trigger: 'admin_seed',
        },
        priority
      );

      if (job) {
        requested++;
      } else {
        skipped++;
      }
    }

    return { requested, skipped, notFound };
  }

  /**
   * 시드 상태 조회
   */
  async getSeedStatus(): Promise<{
    totalSeeded: number;
    ready: number;
    queued: number;
    generating: number;
    failed: number;
  }> {
    const [ready, queued, generating, failed] = await Promise.all([
      videoRepository.countByStatus('READY'),
      videoRepository.countByStatus('QUEUED'),
      videoRepository.countByStatus('GENERATING'),
      videoRepository.countByStatus('FAILED'),
    ]);

    return {
      totalSeeded: ready + queued + generating + failed,
      ready,
      queued,
      generating,
      failed,
    };
  }
}

export const bestsellerSeedService = new BestsellerSeedService();
