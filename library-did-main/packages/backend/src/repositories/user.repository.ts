import prisma from '../config/database';
import { AdminUser } from '@prisma/client';

export class UserRepository {
  async findByUsername(username: string): Promise<AdminUser | null> {
    return prisma.adminUser.findUnique({
      where: { username },
    });
  }

  async findById(id: string): Promise<AdminUser | null> {
    return prisma.adminUser.findUnique({
      where: { id },
    });
  }

  async create(data: { username: string; passwordHash: string; role?: string }): Promise<AdminUser> {
    return prisma.adminUser.create({
      data,
    });
  }

  async update(id: string, data: Partial<AdminUser>): Promise<AdminUser> {
    return prisma.adminUser.update({
      where: { id },
      data,
    });
  }
}

export const userRepository = new UserRepository();
