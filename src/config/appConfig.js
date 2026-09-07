// =============================================================
//  SINGLE SOURCE OF TRUTH — brand, locale & contact configuration
// -------------------------------------------------------------
//  Change values HERE and they update across the whole website
//  (brand name, currency, phone/email/address defaults, cities,
//  languages). Contact details & socials can also be overridden
//  live from the Admin → Settings screen (stored in Supabase);
//  the values below are the defaults used until then.
// =============================================================

export const APP_CONFIG = {
  brand: {
    name: 'Lab Easy',
    tagline: 'Diagnostics, organised.',
  },

  // Country / locale
  country: 'Bangladesh',
  countryCode: 'BD',
  phoneCode: '+880',

  // Currency shown across the site (public + admin)
  currency: {
    code: 'BDT',
    symbol: '৳',
    locale: 'en-BD',
  },

  // Date formatting locale (day-month-year)
  dateLocale: 'en-GB',

  // Default contact details (overridable from Admin → Settings)
  contact: {
    phone: '+880 1711-123456',
    email: 'hello@labeasy.health',
    address: 'Level 4, Wellness Tower, Gulshan Avenue, Dhaka 1212, Bangladesh',
    hours: 'Sat - Thu: 8:00 AM - 10:00 PM',
  },

  // Default social links (overridable from Admin → Settings)
  social: {
    facebook: { url: 'https://facebook.com/labeasy', enabled: true },
    twitter: { url: 'https://x.com/labeasy', enabled: true },
    instagram: { url: 'https://instagram.com/labeasy', enabled: true },
    linkedin: { url: 'https://linkedin.com/company/labeasy', enabled: true },
    youtube: { url: 'https://youtube.com/@labeasy', enabled: false },
  },

  // Serviceable cities (Bangladesh)
  cities: ['Dhaka', 'Chattogram', 'Khulna', 'Rajshahi', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh'],

  // Languages offered
  languages: ['Bangla', 'English', 'Hindi'],
};

export default APP_CONFIG;
