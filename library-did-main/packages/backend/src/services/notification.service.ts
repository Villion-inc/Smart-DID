import { notificationRepository } from '../repositories/notification.repository';
import { Notification } from '@prisma/client';

export class NotificationService {
  async createNotification(type: string, message: string): Promise<Notification> {
    return notificationRepository.create({ type, message });
  }

  async getNotifications(options?: {
    skip?: number;
    take?: number;
    isRead?: boolean;
  }): Promise<Notification[]> {
    return notificationRepository.findAll(options);
  }

  async markAsRead(id: string): Promise<Notification> {
    return notificationRepository.markAsRead(id);
  }

  async markAllAsRead(): Promise<{ count: number }> {
    return notificationRepository.markAllAsRead();
  }

  async getUnreadCount(): Promise<number> {
    return notificationRepository.count(false);
  }

  async deleteNotification(id: string): Promise<Notification> {
    return notificationRepository.delete(id);
  }
}

export const notificationService = new NotificationService();
