import prisma from '../config/database';
import { VideoRecord, Prisma } from '@prisma/client';
import { VideoStatus } from '../types';

export class VideoRepository {
  async findByBookId(bookId: string): Promise<VideoRecord | null> {
    return prisma.videoRecord.findUnique({
      where: { bookId },
    });
  }

  async create(data: {
    bookId: string;
    status?: VideoStatus;
    expiresAt?: Date;
  }): Promise<VideoRecord> {
    return prisma.videoRecord.create({
      data,
    });
  }

  async update(
    bookId: string,
    data: Partial<Omit<VideoRecord, 'bookId' | 'createdAt'>>
  ): Promise<VideoRecord> {
    return prisma.videoRecord.update({
      where: { bookId },
      data,
    });
  }

  async upsert(
    bookId: string,
    create: {
      bookId: string;
      status?: VideoStatus;
      expiresAt?: Date;
    },
    update: Partial<Omit<VideoRecord, 'bookId' | 'createdAt'>>
  ): Promise<VideoRecord> {
    return prisma.videoRecord.upsert({
      where: { bookId },
      create,
      update,
    });
  }

  async findByStatus(status: VideoStatus): Promise<VideoRecord[]> {
    return prisma.videoRecord.findMany({
      where: { status },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.VideoRecordWhereInput;
    orderBy?: Prisma.VideoRecordOrderByWithRelationInput | Prisma.VideoRecordOrderByWithRelationInput[];
  }): Promise<VideoRecord[]> {
    return prisma.videoRecord.findMany({
      skip: options?.skip,
      take: options?.take,
      where: options?.where,
      orderBy: options?.orderBy || { rankingScore: 'desc' },
    });
  }

  async countByStatus(status: VideoStatus): Promise<number> {
    return prisma.videoRecord.count({
      where: { status },
    });
  }

  async countAll(): Promise<number> {
    return prisma.videoRecord.count();
  }

  async incrementRequestCount(bookId: string): Promise<VideoRecord> {
    return prisma.videoRecord.update({
      where: { bookId },
      data: {
        requestCount: { increment: 1 },
        lastRequestedAt: new Date(),
      },
    });
  }

  async updateRankingScore(bookId: string, score: number): Promise<VideoRecord> {
    return prisma.videoRecord.update({
      where: { bookId },
      data: { rankingScore: score },
    });
  }

  async delete(bookId: string): Promise<VideoRecord> {
    return prisma.videoRecord.delete({
      where: { bookId },
    });
  }

  async getExpiredVideos(): Promise<VideoRecord[]> {
    return prisma.videoRecord.findMany({
      where: {
        status: 'READY',
        expiresAt: { lt: new Date() },
      },
    });
  }

  async getReadyVideosOrderByRanking(limit: number): Promise<VideoRecord[]> {
    return prisma.videoRecord.findMany({
      where: { status: 'READY' },
      orderBy: { rankingScore: 'desc' },
      take: limit,
    });
  }
}

export const videoRepository = new VideoRepository();
