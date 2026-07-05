// =============================================================
//  COUNTRY PRESETS
//  Each entry drives currency, phone validation + placeholder,
//  post-code rules, cities and languages across the whole app.
//  The active country is chosen by the admin in Settings and
//  stored as the `country_code` site setting.
// =============================================================

export const COUNTRIES = {
  BD: {
    code: 'BD', name: 'Bangladesh', phoneCode: '+880', dateLocale: 'en-GB',
    currency: { code: 'BDT', symbol: '৳', locale: 'en-BD' },
    phone: { pattern: '^[0-9]{11}$', placeholder: 'e.g. 01712345678', maxLength: 11, label: '11-digit mobile number' },
    postcode: { pattern: '^[0-9]{4}$', maxLength: 4, label: '4-digit post code', placeholder: 'e.g. 1212' },
    cities: ['Dhaka', 'Chattogram', 'Khulna', 'Rajshahi', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh'],
    languages: ['Bangla', 'English', 'Hindi'],
  },
  IN: {
    code: 'IN', name: 'India', phoneCode: '+91', dateLocale: 'en-IN',
    currency: { code: 'INR', symbol: '₹', locale: 'en-IN' },
    phone: { pattern: '^[0-9]{10}$', placeholder: 'e.g. 9876543210', maxLength: 10, label: '10-digit mobile number' },
    postcode: { pattern: '^[1-9][0-9]{5}$', maxLength: 6, label: '6-digit PIN code', placeholder: 'e.g. 560001' },
    cities: ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata'],
    languages: ['English', 'Hindi', 'Tamil', 'Telugu', 'Marathi', 'Bengali'],
  },
  US: {
    code: 'US', name: 'United States', phoneCode: '+1', dateLocale: 'en-US',
    currency: { code: 'USD', symbol: '$', locale: 'en-US' },
    phone: { pattern: '^[0-9]{10}$', placeholder: 'e.g. 2025550123', maxLength: 10, label: '10-digit phone number' },
    postcode: { pattern: '^[0-9]{5}$', maxLength: 5, label: '5-digit ZIP code', placeholder: 'e.g. 10001' },
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Seattle', 'Boston'],
    languages: ['English', 'Spanish'],
  },
  GB: {
    code: 'GB', name: 'United Kingdom', phoneCode: '+44', dateLocale: 'en-GB',
    currency: { code: 'GBP', symbol: '£', locale: 'en-GB' },
    phone: { pattern: '^[0-9]{10,11}$', placeholder: 'e.g. 07123456789', maxLength: 11, label: 'UK phone number' },
    postcode: { pattern: '^[A-Za-z0-9 ]{5,8}$', maxLength: 8, label: 'postcode', placeholder: 'e.g. SW1A 1AA' },
    cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Bristol'],
    languages: ['English'],
  },
  AE: {
    code: 'AE', name: 'United Arab Emirates', phoneCode: '+971', dateLocale: 'en-GB',
    currency: { code: 'AED', symbol: 'د.إ', locale: 'en-AE' },
    phone: { pattern: '^[0-9]{9,10}$', placeholder: 'e.g. 0501234567', maxLength: 10, label: 'mobile number' },
    postcode: { pattern: '^.{0,10}$', maxLength: 10, label: 'area / PO Box', placeholder: 'Optional' },
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Al Ain', 'Ras Al Khaimah', 'Fujairah'],
    languages: ['English', 'Arabic', 'Hindi'],
  },
  PK: {
    code: 'PK', name: 'Pakistan', phoneCode: '+92', dateLocale: 'en-GB',
    currency: { code: 'PKR', symbol: '₨', locale: 'en-PK' },
    phone: { pattern: '^[0-9]{11}$', placeholder: 'e.g. 03001234567', maxLength: 11, label: '11-digit mobile number' },
    postcode: { pattern: '^[0-9]{5}$', maxLength: 5, label: '5-digit post code', placeholder: 'e.g. 44000' },
    cities: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar'],
    languages: ['English', 'Urdu'],
  },
};

export const DEFAULT_COUNTRY = 'BD';

// For the admin dropdown
export const COUNTRY_OPTIONS = Object.values(COUNTRIES).map((c) => ({ value: c.code, label: `${c.name} (${c.currency.symbol})` }));
