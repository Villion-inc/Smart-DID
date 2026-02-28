import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Cloud Run: SQLite DB를 쓰기 가능한 /tmp로 복사
function initDatabaseUrl(): string {
  const originalUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  
  // Production 환경에서만 /tmp로 복사
  if (process.env.NODE_ENV === 'production') {
    const srcDb = path.resolve('./prisma/dev.db');
    const tmpDb = '/tmp/dev.db';
    
    if (fs.existsSync(srcDb) && !fs.existsSync(tmpDb)) {
      try {
        fs.copyFileSync(srcDb, tmpDb);
        console.log(`[DB] Copied ${srcDb} to ${tmpDb}`);
      } catch (err) {
        console.error(`[DB] Failed to copy DB:`, err);
      }
    }
    
    if (fs.existsSync(tmpDb)) {
      return `file:${tmpDb}`;
    }
  }
  
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
