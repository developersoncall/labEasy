import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { settingsService, DEFAULT_SETTINGS } from '../services/settingsService.js';
import { applyCountry, getCountry } from '../config/runtimeLocale.js';

/**
 * Provides live site settings (contact info, social links, branding) to
 * the whole app. Loaded once from Supabase on mount; the admin panel calls
 * refresh() after saving so changes appear everywhere without a reload.
 */
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const map = await settingsService.getAll();
      setSettings(map);
      // Apply the admin-selected country app-wide. If it differs from what
      // this session loaded with, reload once so every currency/phone/city
      // reference picks up the new preset consistently.
      if (map.country_code && applyCountry(map.country_code)) {
        window.location.reload();
        return;
      }
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Convenience: array of enabled social links in display order.
  const socialLinks = ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube']
    .map((key) => ({ key, ...(settings[`social_${key}`] || {}) }))
    .filter((s) => s.enabled && s.url);

  const value = {
    settings,
    loading,
    refresh,
    // flattened helpers used across the public site
    // Brand always shows something (never blank the logo).
    brandName: settings.brand_name || DEFAULT_SETTINGS.brand_name,
    brandTagline: settings.brand_tagline || DEFAULT_SETTINGS.brand_tagline,
    // Contact fields use the stored value as-is. getAll() already fills defaults
    // for keys that don't exist, so an explicit "" means the admin cleared it on
    // purpose → the public site hides that row. (?? only guards undefined.)
    contactPhone: settings.contact_phone ?? '',
    contactEmail: settings.contact_email ?? '',
    contactAddress: settings.contact_address ?? '',
    contactHours: settings.contact_hours ?? '',
    socialLinks,
    // Platform mode flags (see newSQL.html section 14). While the public
    // portal is off, patient-facing routes redirect to the informational home.
    publicPortalEnabled: settings.public_portal_enabled === true,
    labRegistrationOpen: settings.lab_registration_open !== false,
    // active country (drives currency, phone rules, cities)
    countryCode: getCountry().code,
    countryName: getCountry().name,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
