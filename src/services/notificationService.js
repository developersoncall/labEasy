import { supabase } from '../supabase/supabase.js';

/**
 * In-app notifications (confirmation, reminders, report-ready).
 * Supabase table: notifications.
 */
export const notificationService = {
  async create({ userId, type, title, message }) {
    const record = {
      user_id: userId,
      type,
      title,
      message,
      is_read: false,
    };
    const { data, error } = await supabase.from('notifications').insert(record).select().single();
    if (error) throw error;
    return data;
  },

  async getMyNotifications(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getUnreadCount(userId) {
    const all = await this.getMyNotifications(userId);
    return all.filter((n) => !n.is_read).length;
  },

  async markAsRead(id) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
    return true;
  },

  async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return true;
  },
};
