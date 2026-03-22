import crypto from 'crypto';
import prisma from '../config/database';
import { Recommendation } from '@prisma/client';

export class RecommendationRepository {
  async getByAgeGroup(ageGroup: string): Promise<Recommendation[]> {
    return prisma.recommendation.findMany({
      where: { ageGroup },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getAll(): Promise<Recommendation[]> {
    return prisma.recommendation.findMany({
      orderBy: [{ ageGroup: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async create(data: {
    bookId?: string;
    ageGroup: string;
    title: string;
    author: string;
    publisher?: string;
    summary?: string;
    coverImageUrl?: string;
    category?: string;
    sortOrder?: number;
  }): Promise<Recommendation> {
    const bookId = data.bookId || `REC-${crypto.randomUUID()}`;

    // sortOrder 자동 계산: 해당 연령 그룹의 마지막 순서 + 1
    let sortOrder = data.sortOrder ?? 0;
    if (sortOrder === 0) {
      const lastItem = await prisma.recommendation.findFirst({
        where: { ageGroup: data.ageGroup },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (lastItem?.sortOrder ?? 0) + 1;
    }

    return prisma.recommendation.create({
      data: {
        bookId,
        ageGroup: data.ageGroup,
        sortOrder,
        title: data.title,
        author: data.author,
        publisher: data.publisher ?? '',
        summary: data.summary ?? '',
        coverImageUrl: data.coverImageUrl ?? null,
        category: data.category ?? '',
      },
    });
  }

  async remove(id: string): Promise<Recommendation> {
    return prisma.recommendation.delete({
      where: { id },
    });
  }
}

export const recommendationRepository = new RecommendationRepository();
