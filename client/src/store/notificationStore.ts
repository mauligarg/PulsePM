import { create } from 'zustand';
import { NotificationItem } from '../types';
import { notificationApi } from '../api/notifications';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  addNotification: (notif: NotificationItem) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const res = await notificationApi.list();
      set({
        notifications: res.data.notifications,
        unreadCount: res.data.unreadCount,
      });
    } catch {
      // ignore when unauthenticated
    }
  },

  addNotification: (notif) => {
    set((state) => {
      if (state.notifications.some((n) => n._id === notif._id)) return state;
      return {
        notifications: [notif, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    });
  },

  markAsRead: async (id) => {
    try {
      await notificationApi.markAsRead(id);
      set((state) => {
        const target = state.notifications.find((n) => n._id === id);
        const wasUnread = target && !target.read;
        return {
          notifications: state.notifications.map((n) =>
            n._id === id ? { ...n, read: true } : n
          ),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  },
}));
