import { apiClient } from './client';
import { NotificationItem } from '../types';

export const notificationApi = {
  list: (): Promise<{ success: boolean; data: { notifications: NotificationItem[]; unreadCount: number } }> =>
    apiClient.get('/notifications') as any,

  markAsRead: (id: string): Promise<{ success: boolean; data: NotificationItem }> =>
    apiClient.patch(`/notifications/${id}/read`) as any,

  markAllAsRead: (): Promise<{ success: boolean }> =>
    apiClient.post('/notifications/read-all') as any,
};
