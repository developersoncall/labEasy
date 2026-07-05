import { supabase } from '../supabase/supabase.js';

/**
 * User profile + medical information.
 * Supabase table: user_profiles (1:1 with auth.users).
 */
const EMPTY_PROFILE = {
  full_name: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  blood_group: '',
  height_cm: '',
  weight_kg: '',
  allergies: '',
  chronic_conditions: '',
  current_medications: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  address: '',
  city: '',
  pincode: '',
  avatar_url: '',
};

export const profileService = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data || { ...EMPTY_PROFILE, user_id: userId };
  },

  async updateProfile(userId, patch) {
    // Postgres date/numeric columns reject empty strings ("") — an untouched
    // Date of birth or Height/Weight field arrives as "". Coerce those to null.
    const clean = { ...patch };
    ['date_of_birth', 'height_cm', 'weight_kg'].forEach((k) => {
      if (k in clean && (clean[k] === '' || clean[k] === undefined)) clean[k] = null;
    });
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({ user_id: userId, ...clean }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Upload an avatar to Supabase Storage (bucket: avatars). */
  async uploadAvatar(userId, file) {
    const path = `${userId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  },
};
