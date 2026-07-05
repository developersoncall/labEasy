// -------------------------------------------------------------
// Small pure helpers used across the app
// Currency / date / phone rules come from the ACTIVE country
// (chosen by the admin in Settings — see config/runtimeLocale.js).
// -------------------------------------------------------------
import { getCountry, getCurrency } from '../config/runtimeLocale.js';

/** Format a number as the active country's currency, e.g. 1499 -> ৳1,499 / ₹1,499 / $1,499 */
export const formatCurrency = (amount) => {
  const c = getCurrency();
  return `${c.symbol}${Number(amount || 0).toLocaleString(c.locale)}`;
};

/** The active currency symbol (₹, ৳, $, …). */
export const currencySymbol = () => getCurrency().symbol;

/** Format an ISO date (or Date) as e.g. "12 Jun 2026" */
export const formatDate = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(getCountry().dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Format an ISO date as e.g. "Friday, 12 June 2026" */
export const formatDateLong = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(getCountry().dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/** react-hook-form rules for a mobile number in the active country. */
export const phoneRule = (required = true) => {
  const p = getCountry().phone;
  return {
    pattern: new RegExp(p.pattern),
    placeholder: p.placeholder,
    maxLength: p.maxLength,
    message: `Enter a valid ${p.label}`,
    required,
  };
};

/** react-hook-form rules for a post/ZIP/PIN code in the active country. */
export const postcodeRule = () => {
  const p = getCountry().postcode;
  return {
    pattern: new RegExp(p.pattern),
    maxLength: p.maxLength,
    label: p.label,
    placeholder: p.placeholder,
    message: `Enter a valid ${p.label}`,
  };
};

/** Percentage discount from MRP to price, e.g. (299, 450) -> 34 */
export const discountPercent = (price, mrp) => {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

/** Build the next `count` days as objects for date pickers */
export const getUpcomingDates = (count = 7) => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      iso: d.toISOString().split('T')[0],
      dayShort: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
    });
  }
  return days;
};

/** Simple unique id for demo-mode records */
export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Kebab-case a string for slugs */
export const slugify = (text = '') =>
  text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');

/** Clamp text to n characters with ellipsis */
export const truncate = (text = '', n = 120) =>
  text.length > n ? `${text.slice(0, n).trimEnd()}…` : text;

/** Scroll window to top (used after route changes inside flows) */
export const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

/**
 * Turn a local phone number into a wa.me-ready international number (digits
 * only, prefixed with the active country's dialing code). e.g. BD
 * "01711-123456" -> "8801711123456". Returns '' when there's nothing usable.
 */
export const whatsappNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const cc = String(getCountry().phoneCode || '').replace(/\D/g, '');
  if (!cc || digits.startsWith(cc)) return digits;
  return cc + digits.replace(/^0+/, '');
};

/** Set the document title consistently */
export const setPageTitle = (title) => {
  document.title = title ? `${title} | LabEasy` : 'LabEasy — Healthcare Appointments & Diagnostics';
};
