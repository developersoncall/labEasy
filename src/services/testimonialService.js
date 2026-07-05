import { supabase } from '../supabase/supabase.js';

/**
 * Customer testimonials shown on the home page.
 * Supabase table: testimonials.
 */

// Map a Supabase row to the shape the UI uses (camelCase).
const fromRow = (row) => ({
  id: row.id,
  name: row.name,
  avatar: row.avatar_url,
  rating: Number(row.rating),
  city: row.city,
  service: row.service,
  text: row.quote,
});

export const testimonialService = {
  async getAll() {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data.map(fromRow);
  },
};
