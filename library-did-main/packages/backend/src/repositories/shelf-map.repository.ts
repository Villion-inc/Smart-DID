import prisma from '../config/database';
import { ShelfMap } from '@prisma/client';

export class ShelfMapRepository {
  async findByBookId(bookId: string): Promise<ShelfMap | null> {
    return prisma.shelfMap.findUnique({
      where: { bookId },
    });
  }

  async findByShelfCode(shelfCode: string): Promise<ShelfMap[]> {
    return prisma.shelfMap.findMany({
      where: { shelfCode },
    });
  }

  async create(data: {
    bookId: string;
    shelfCode: string;
    mapX: number;
    mapY: number;
  }): Promise<ShelfMap> {
    return prisma.shelfMap.create({
      data,
    });
  }

  async update(
    bookId: string,
    data: Partial<Omit<ShelfMap, 'id' | 'bookId' | 'createdAt'>>
  ): Promise<ShelfMap> {
    return prisma.shelfMap.update({
      where: { bookId },
      data,
    });
  }

  async upsert(
    bookId: string,
    data: {
      bookId: string;
      shelfCode: string;
      mapX: number;
      mapY: number;
    }
  ): Promise<ShelfMap> {
    return prisma.shelfMap.upsert({
      where: { bookId },
      create: data,
      update: {
        shelfCode: data.shelfCode,
        mapX: data.mapX,
        mapY: data.mapY,
      },
    });
  }

  async delete(bookId: string): Promise<ShelfMap> {
    return prisma.shelfMap.delete({
      where: { bookId },
    });
  }

  async findAll(): Promise<ShelfMap[]> {
    return prisma.shelfMap.findMany();
  }
}

export const shelfMapRepository = new ShelfMapRepository();
