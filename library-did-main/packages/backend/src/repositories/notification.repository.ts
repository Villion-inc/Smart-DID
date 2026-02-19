import prisma from '../config/database';
import { Notification } from '@prisma/client';

export class NotificationRepository {
  async create(data: { type: string; message: string }): Promise<Notification> {
    return prisma.notification.create({
      data,
    });
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    isRead?: boolean;
  }): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: options?.isRead !== undefined ? { isRead: options.isRead } : undefined,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Notification | null> {
    return prisma.notification.findUnique({
      where: { id },
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(): Promise<{ count: number }> {
    return prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  }

  async delete(id: string): Promise<Notification> {
    return prisma.notification.delete({
      where: { id },
    });
  }

  async count(isRead?: boolean): Promise<number> {
    return prisma.notification.count({
      where: isRead !== undefined ? { isRead } : undefined,
    });
  }
}

export const notificationRepository = new NotificationRepository();
