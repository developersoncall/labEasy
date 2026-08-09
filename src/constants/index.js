// -------------------------------------------------------------
// Global app constants (navigation, contact info, enums)
// Brand / locale / contact values come from the single config file.
// -------------------------------------------------------------
import { APP_CONFIG } from '../config/appConfig.js';
import { getCountry } from '../config/runtimeLocale.js';

export const APP_NAME = APP_CONFIG.brand.name;
export const APP_TAGLINE = APP_CONFIG.brand.tagline;

export const CONTACT_INFO = { ...APP_CONFIG.contact };

export const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Doctors', path: '/doctors' },
  { label: 'Specialties', path: '/specialties' },
  { label: 'Lab Tests', path: '/diagnostic-tests' },
  { label: 'Health Packages', path: '/health-packages' },
  { label: 'Video Consult', path: '/video-consultation' },
  { label: 'Blogs', path: '/blogs' },
];

export const CONSULTATION_TYPES = [
  { id: 'clinic', label: 'In-Clinic Visit', description: 'Meet the doctor at the clinic' },
  { id: 'video', label: 'Video Consultation', description: 'Consult online over a secure video call' },
];

// Aligned with the Medis admin panel workflow
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SAMPLE_COLLECTED: 'sample_collected',
  PROCESSING: 'processing',
  REPORT_READY: 'report_ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  sample_collected: 'Sample Collected',
  processing: 'Processing',
  report_ready: 'Report Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  sample_collected: 'bg-indigo-100 text-indigo-700',
  processing: 'bg-purple-100 text-purple-700',
  report_ready: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

export const COLLECTION_TYPES = [
  { id: 'home', label: 'Home Sample Collection', description: 'A certified phlebotomist visits your home' },
  { id: 'lab', label: 'Lab Visit', description: 'Walk in to the nearest Medis centre' },
];

export const TIME_SLOT_GROUPS = {
  morning: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
  afternoon: ['12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'],
  evening: ['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'],
};

// Cities & languages follow the active country (admin-selectable).
export const CITIES = [...getCountry().cities];

export const LANGUAGES = [...getCountry().languages];
