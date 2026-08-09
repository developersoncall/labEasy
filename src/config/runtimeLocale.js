import { COUNTRIES, DEFAULT_COUNTRY } from './countries.js';

/**
 * Holds the ACTIVE country preset for the whole app.
 *
 * The value is read synchronously by non-hook helpers (formatCurrency,
 * phone/postcode validators, city lists) so it must be available at module
 * load — we seed it from a localStorage cache to avoid a flash, and
 * SettingsContext confirms/updates it from the `country_code` DB setting.
 */
const CACHE_KEY = 'medis_country';

const readCache = () => {
  try {
    const code = localStorage.getItem(CACHE_KEY);
    return COUNTRIES[code] ? code : DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
};

let currentCode = readCache();

/** The active country preset object. */
export const getCountry = () => COUNTRIES[currentCode] || COUNTRIES[DEFAULT_COUNTRY];

/** Active currency ({ code, symbol, locale }). */
export const getCurrency = () => getCountry().currency;

/** Convenience: just the currency symbol (₹, ৳, $, …). */
export const currencySymbol = () => getCountry().currency.symbol;

/**
 * Set the active country and cache it. Returns true if it actually changed —
 * callers use this to decide whether a reload is needed so every hard-coded
 * currency/phone reference across the app picks up the new preset.
 */
export const applyCountry = (code) => {
  if (!COUNTRIES[code] || code === currentCode) return false;
  currentCode = code;
  try { localStorage.setItem(CACHE_KEY, code); } catch { /* ignore */ }
  return true;
};

export const getCountryCode = () => currentCode;
