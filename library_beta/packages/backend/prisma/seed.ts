import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';

  const existingAdmin = await prisma.adminUser.findUnique({
    where: { username: adminUsername },
  });

  if (existingAdmin) {
    console.log(`✓ Admin user "${adminUsername}" already exists`);
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.adminUser.create({
      data: {
        username: adminUsername,
        passwordHash,
        role: 'admin',
      },
    });
    console.log(`✓ Created admin user: ${adminUsername}`);
    console.log(`  Password: ${adminPassword}`);
  }

  // Seed shelf map data for some books
  const shelfMapData = [
    { bookId: 'BK001', shelfCode: '1A', mapX: 10, mapY: 20 },
    { bookId: 'BK002', shelfCode: '1A', mapX: 30, mapY: 20 },
    { bookId: 'BK003', shelfCode: '1B', mapX: 10, mapY: 60 },
    { bookId: 'BK004', shelfCode: '1B', mapX: 30, mapY: 60 },
    { bookId: 'BK005', shelfCode: '2A', mapX: 50, mapY: 20 },
    { bookId: 'BK006', shelfCode: '2A', mapX: 70, mapY: 20 },
    { bookId: 'BK007', shelfCode: '2B', mapX: 50, mapY: 60 },
    { bookId: 'BK008', shelfCode: '2B', mapX: 70, mapY: 60 },
    { bookId: 'BK009', shelfCode: '3A', mapX: 90, mapY: 20 },
    { bookId: 'BK010', shelfCode: '3A', mapX: 110, mapY: 20 },
    { bookId: 'BK011', shelfCode: '3B', mapX: 90, mapY: 60 },
    { bookId: 'BK012', shelfCode: '3B', mapX: 110, mapY: 60 },
    { bookId: 'BK013', shelfCode: '4A', mapX: 130, mapY: 20 },
    { bookId: 'BK014', shelfCode: '4A', mapX: 150, mapY: 20 },
    { bookId: 'BK015', shelfCode: '4B', mapX: 130, mapY: 60 },
    { bookId: 'BK016', shelfCode: '4B', mapX: 150, mapY: 60 },
    { bookId: 'BK017', shelfCode: '5A', mapX: 170, mapY: 20 },
    { bookId: 'BK018', shelfCode: '5A', mapX: 190, mapY: 20 },
    { bookId: 'BK019', shelfCode: '5B', mapX: 170, mapY: 60 },
    { bookId: 'BK020', shelfCode: '5B', mapX: 190, mapY: 60 },
  ];

  let shelfMapCount = 0;
  for (const data of shelfMapData) {
    await prisma.shelfMap.upsert({
      where: { bookId: data.bookId },
      update: data,
      create: data,
    });
    shelfMapCount++;
  }
  console.log(`✓ Seeded ${shelfMapCount} shelf map entries`);

  // Create a few sample video records (optional)
  const sampleVideoRecords = [
    {
      bookId: 'BK006',
      status: 'READY' as const,
      requestCount: 15,
      lastRequestedAt: new Date(),
      rankingScore: 22.5,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      videoUrl: 'https://example.com/videos/bk006.mp4',
    },
    {
      bookId: 'BK007',
      status: 'READY' as const,
      requestCount: 8,
      lastRequestedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      rankingScore: 8,
      expiresAt: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
      videoUrl: 'https://example.com/videos/bk007.mp4',
    },
    {
      bookId: 'BK001',
      status: 'QUEUED' as const,
      requestCount: 0,
      lastRequestedAt: new Date(),
      rankingScore: 0,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  ];

  let videoCount = 0;
  for (const record of sampleVideoRecords) {
    await prisma.videoRecord.upsert({
      where: { bookId: record.bookId },
      update: record,
      create: record,
    });
    videoCount++;
  }
  console.log(`✓ Seeded ${videoCount} sample video records`);

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
