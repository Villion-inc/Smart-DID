import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.LOG_PRISMA_QUERIES === 'true' ? ['query', 'error', 'warn'] : ['error', 'warn'],
});

export default prisma;
