import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  isInitialized: boolean;
  initNotifications: (userId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  clearAll: (userId: string) => Promise<void>;
  snooze: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isInitialized: false,

  initNotifications: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ notifications: data || [], isInitialized: true });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  },
  
  addNotification: async (notification) => {
    const tempId = `temp-notif-${Date.now()}`;
    const newNotif = { ...notification };

    set((state) => ({
      notifications: [
        {
          ...newNotif,
          id: tempId,
          created_at: new Date().toISOString(),
        },
        ...state.notifications
      ]
    }));

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([newNotif])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        notifications: state.notifications.map(n => n.id === tempId ? data : n)
      }));
    } catch (error) {
      console.error('Error adding notification:', error);
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== tempId)
      }));
    }
  },
  
  markAsRead: async (id) => {
    const state = get();
    set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    }));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      set({ notifications: state.notifications });
    }
  },
  
  clearAll: async (userId) => {
    const state = get();
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
    }));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      set({ notifications: state.notifications });
    }
  },
  
  snooze: async (id) => {
    // For now snooze just marks as read locally
    get().markAsRead(id);
  }
}));

