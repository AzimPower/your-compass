import { create } from 'zustand';
import { db, type Notification } from '@/lib/database';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (userId: string) => {
    try {
      const notifs = await db.notifications
        .where('userId')
        .equals(userId)
        .toArray();
      
      const sorted = notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      set({
        notifications: sorted,
        unreadCount: sorted.filter(n => !n.read).length,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  },

  markAsRead: async (notificationId: string) => {
    await db.notifications.update(notificationId, { read: true });
    const { notifications } = get();
    const updated = notifications.map(n => n.id === notificationId ? { ...n, read: true } : n);
    set({ notifications: updated, unreadCount: updated.filter(n => !n.read).length });
  },

  markAllAsRead: async (userId: string) => {
    const notifs = await db.notifications.where('userId').equals(userId).toArray();
    await Promise.all(notifs.filter(n => !n.read).map(n => db.notifications.update(n.id, { read: true })));
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
}));
