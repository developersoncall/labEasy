import { supabase } from '../supabase/supabase.js';

/**
 * Favourite doctors.
 * Supabase table: favorites (user_id + doctor_id).
 */
export const favoriteService = {
  async getMyFavorites(userId) {
    const { data, error } = await supabase
      .from('favorites')
      .select('doctor_id')
      .eq('user_id', userId);
    if (error) throw error;
    return data.map((f) => f.doctor_id);
  },

  async toggle(userId, doctorId) {
    const favorites = await this.getMyFavorites(userId);
    const isFav = favorites.some((id) => String(id) === String(doctorId));

    if (isFav) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('doctor_id', doctorId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: userId, doctor_id: doctorId });
      if (error) throw error;
    }

    return !isFav; // new state
  },
};
