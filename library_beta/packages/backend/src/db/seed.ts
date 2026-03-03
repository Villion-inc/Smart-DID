/**
 * Seed data for development and production
 * Uses Prisma directly for database operations
 */

import bcrypt from 'bcryptjs';
import prisma from '../config/database';

export async function seedDatabase(): Promise<void> {
  console.log('Seeding database...');

  // Create admin user
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  
  await prisma.adminUser.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      passwordHash,
      role: 'admin',
    },
  });
  console.log('Admin user created');

  // GCS에 업로드된 실제 영상 레코드
  const gcsVideoRecords = [
    {
      bookId: '70007968',
      status: 'READY',
      videoUrl: '/videos/70007968-1772221734134.mp4',
      subtitleUrl: '/videos/70007968-1772221734134.vtt',
      requestCount: 5,
      lastRequestedAt: new Date(),
      retryCount: 0,
      rankingScore: 10,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    {
      bookId: '84240544',
      status: 'READY',
      videoUrl: '/videos/84240544-1772218317147.mp4',
      subtitleUrl: '/videos/84240544-1772218317147.vtt',
      requestCount: 3,
      lastRequestedAt: new Date(),
      retryCount: 0,
      rankingScore: 8,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const record of gcsVideoRecords) {
    await prisma.videoRecord.upsert({
      where: { bookId: record.bookId },
      update: {
        status: record.status,
        videoUrl: record.videoUrl,
        subtitleUrl: record.subtitleUrl,
        requestCount: record.requestCount,
        lastRequestedAt: record.lastRequestedAt,
        retryCount: record.retryCount,
        rankingScore: record.rankingScore,
        expiresAt: record.expiresAt,
      },
      create: record,
    });
    console.log(`Video record created for bookId: ${record.bookId}`);
  }

  console.log(`Seeded 1 admin user and ${gcsVideoRecords.length} video records`);
  await prisma.$disconnect();
}
