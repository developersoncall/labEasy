import { supabase } from '../supabase/supabase.js';
import { APP_CONFIG } from '../config/appConfig.js';

/**
 * Site settings (contact info, social links, branding) stored as
 * key/value rows in the `settings` table. Edited from the admin panel,
 * read by the public site via SettingsContext.
 *
 * Fallback defaults come from the single brand config file so changing
 * them in one place updates the whole site until an admin overrides.
 */
export const DEFAULT_SETTINGS = {
  country_code: 'BD',
  // Platform mode. false = lab-first only: no public patient dashboard and no
  // public booking flow. The admin can flip this on later with no code change.
  public_portal_enabled: false,
  lab_registration_open: true,
  brand_name: APP_CONFIG.brand.name,
  brand_tagline: APP_CONFIG.brand.tagline,
  contact_phone: APP_CONFIG.contact.phone,
  contact_email: APP_CONFIG.contact.email,
  contact_address: APP_CONFIG.contact.address,
  contact_hours: APP_CONFIG.contact.hours,
  social_facebook: APP_CONFIG.social.facebook,
  social_twitter: APP_CONFIG.social.twitter,
  social_instagram: APP_CONFIG.social.instagram,
  social_linkedin: APP_CONFIG.social.linkedin,
  social_youtube: APP_CONFIG.social.youtube,
};

export const settingsService = {
  /** Fetch every settings row and return a plain { key: value } map merged over defaults. */
  async getAll() {
    if (!supabase) return { ...DEFAULT_SETTINGS };
    const { data, error } = await supabase.from('settings').select('key, value');
    if (error) throw error;
    const map = { ...DEFAULT_SETTINGS };
    (data || []).forEach((row) => {
      map[row.key] = row.value;
    });
    return map;
  },

  /** Upsert a single setting by key (value is stored as jsonb). */
  async update(key, value) {
    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Upsert several settings at once. `entries` is a { key: value } object. */
  async updateMany(entries) {
    const rows = Object.entries(entries).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
    return true;
  },
};
