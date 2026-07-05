import { supabase } from '../supabase/supabase.js';

/**
 * Doctor reviews.
 * Supabase table: reviews.
 */
export const reviewService = {
  async getForDoctor(doctorId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async add({ userId, doctorId, reviewerName, rating, comment }) {
    const record = {
      user_id: userId,
      doctor_id: doctorId,
      reviewer_name: reviewerName,
      rating,
      comment,
      is_approved: true,
    };
    const { data, error } = await supabase.from('reviews').insert(record).select().single();
    if (error) throw error;
    return data;
  },
};
