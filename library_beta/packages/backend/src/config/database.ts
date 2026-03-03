import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Cloud Run: SQLite DB를 쓰기 가능한 /tmp로 복사
function initDatabaseUrl(): string {
  const originalUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  
  console.log(`[DB] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[DB] Original DATABASE_URL: ${originalUrl}`);
  console.log(`[DB] CWD: ${process.cwd()}`);
  
  // 가능한 소스 DB 경로들
  const possibleSrcPaths = [
    path.resolve('./prisma/dev.db'),
    path.resolve('/app/prisma/dev.db'),
    path.resolve(process.cwd(), 'prisma/dev.db'),
  ];
  
  const tmpDb = '/tmp/dev.db';
  
  // 소스 DB 찾기
  let srcDb: string | null = null;
  for (const p of possibleSrcPaths) {
    console.log(`[DB] Checking: ${p} - exists: ${fs.existsSync(p)}`);
    if (fs.existsSync(p)) {
      srcDb = p;
      break;
    }
  }
  
  if (srcDb && !fs.existsSync(tmpDb)) {
    try {
      fs.copyFileSync(srcDb, tmpDb);
      console.log(`[DB] Copied ${srcDb} to ${tmpDb}`);
    } catch (err) {
      console.error(`[DB] Failed to copy DB:`, err);
    }
  }
  
  if (fs.existsSync(tmpDb)) {
    console.log(`[DB] Using /tmp/dev.db`);
    return `file:${tmpDb}`;
  }
  
  console.log(`[DB] Falling back to: ${originalUrl}`);
  return originalUrl;
}

const databaseUrl = initDatabaseUrl();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
  log: process.env.LOG_PRISMA_QUERIES === 'true' ? ['query', 'error', 'warn'] : ['error', 'warn'],
});

export default prisma;
