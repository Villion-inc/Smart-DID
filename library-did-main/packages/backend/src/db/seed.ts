/**
 * Seed data for development
 */

import { Book, VideoRecord, VideoStatus, User, UserRole } from '@smart-did/shared';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { db } from './index';
import { config } from '../config';
import { logger } from '../config/logger';

export async function seedDatabase(): Promise<void> {
  logger.info('Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash(config.admin.password, 10);
  const adminUser: User = {
    id: uuidv4(),
    username: config.admin.username,
    passwordHash,
    role: UserRole.ADMIN,
    createdAt: new Date(),
  };
  await db.createUser(adminUser);

  // Sample books
  const sampleBooks: Book[] = [
    {
      bookId: 'ISBN-001',
      title: '별을 헤아리는 아이',
      author: '김동화',
      summary: '밤하늘의 별을 세며 꿈을 키워가는 소년의 이야기입니다. 우주에 대한 호기심과 과학적 상상력을 키워줍니다.',
      genre: '과학동화',
      shelfCode: 'A-01-05',
      createdAt: new Date(),
    },
    {
      bookId: 'ISBN-002',
      title: '마법의 도서관',
      author: '이환타',
      summary: '책을 읽으면 그 이야기 속으로 들어갈 수 있는 마법의 도서관에서 펼쳐지는 모험 이야기입니다.',
      genre: '판타지',
      shelfCode: 'B-02-12',
      createdAt: new Date(),
    },
    {
      bookId: 'ISBN-003',
      title: '숲 속의 친구들',
      author: '박자연',
      summary: '숲에 사는 동물 친구들이 서로 도우며 우정을 쌓아가는 따뜻한 이야기입니다.',
      genre: '창작동화',
      shelfCode: 'C-03-08',
      createdAt: new Date(),
    },
    {
      bookId: 'ISBN-004',
      title: '용감한 소방관',
      author: '최영웅',
      summary: '어려운 상황 속에서도 용기를 잃지 않는 소방관의 하루를 통해 직업의 가치를 배웁니다.',
      genre: '직업동화',
      shelfCode: 'D-01-15',
      createdAt: new Date(),
    },
    {
      bookId: 'ISBN-005',
      title: '지구를 지키는 아이들',
      author: '정환경',
      summary: '환경 보호의 중요성을 깨닫고 실천하는 아이들의 이야기입니다.',
      genre: '환경동화',
      shelfCode: 'E-02-20',
      createdAt: new Date(),
    },
  ];

  for (const book of sampleBooks) {
    await db.createBook(book);
  }

  // Create sample video records
  const videoRecord1: VideoRecord = {
    bookId: 'ISBN-001',
    status: VideoStatus.READY,
    videoUrl: '/videos/ISBN-001.mp4',
    subtitleUrl: '/videos/ISBN-001.vtt',
    requestCount: 15,
    lastRequestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    retryCount: 0,
    rankingScore: 20.5,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  };

  const videoRecord2: VideoRecord = {
    bookId: 'ISBN-002',
    status: VideoStatus.NONE,
    requestCount: 0,
    lastRequestedAt: undefined,
    retryCount: 0,
    rankingScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.createVideoRecord(videoRecord1);
  await db.createVideoRecord(videoRecord2);

  logger.info(`Seeded ${sampleBooks.length} books, 1 admin user, and 2 video records`);
}
