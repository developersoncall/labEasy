import { supabase } from '../supabase/supabase.js';

/**
 * Contact form submissions + FAQ content.
 * Supabase tables: contact_messages, faqs.
 */
export const contactService = {
  async sendMessage({ name, email, phone, subject, message }) {
    const record = { name, email, phone: phone || '', subject, message, status: 'new' };
    // No .select() here — anonymous visitors can INSERT but cannot read the
    // row back (only admins can SELECT contact_messages), so selecting the
    // inserted row would fail RLS. We only need to know the insert succeeded.
    const { error } = await supabase.from('contact_messages').insert(record);
    if (error) throw error;
    return true;
  },

  async getFaqs() {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data;
  },
};
