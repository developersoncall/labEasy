import { supabase } from '../supabase/supabase.js';
import { storageService } from '../services/storageService.js';

/**
 * Bridges the ported admin screens (which expect the shapes from the old
 * data.js) to live Supabase tables. Each entity exposes:
 *   load()   -> array in the screen's shape
 *   save(o)  -> insert (no real id) or update (uuid id); returns mapped row
 *   remove(id)
 * plus a few entity-specific helpers.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID.test(v);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '');
const slugify = (t = '') => t.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');

async function selectAll(table, opts = {}) {
  let q = supabase.from(table).select(opts.select || '*');
  if (opts.order) q = q.order(opts.order, { ascending: opts.ascending ?? false });
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}
async function updateRow(table, id, patch, idCol = 'id') {
  const { data, error } = await supabase.from(table).update(patch).eq(idCol, id).select().single();
  if (error) throw error;
  return data;
}
async function deleteRow(table, id, idCol = 'id') {
  const { error } = await supabase.from(table).delete().eq(idCol, id);
  if (error) throw error;
  return true;
}

/* ══════════════ USERS (user_profiles) ══════════════ */
const userFromRow = (r) => ({
  id: r.user_id, ref: r.user_ref || `#${String(r.user_id).slice(0, 6)}`,
  name: r.full_name || '—', phone: r.phone || '', email: r.email || '',
  city: r.city || '', tests: 0, status: r.status || 'active', joined: fmtDate(r.created_at),
  dob: r.date_of_birth || '', gender: r.gender || '', blood: r.blood_group || '',
  address: r.address || '', notes: '', family: [],
});
export const usersData = {
  // Manage Users lists patients only — admins are managed separately, so
  // exclude any profile whose role is 'admin'.
  load: async () => (await selectAll('user_profiles', { order: 'created_at' }))
    .filter((r) => r.role !== 'admin')
    .map(userFromRow),
  // Users self-register — admin can edit existing profiles but not create auth accounts.
  save: async (u) => {
    if (!isUuid(u.id)) throw new Error('Users register themselves. You can edit or manage existing users only.');
    const patch = {
      full_name: u.name, phone: u.phone, city: u.city, gender: u.gender || null,
      blood_group: u.blood || null, date_of_birth: u.dob || null, address: u.address, status: u.status,
    };
    return userFromRow(await updateRow('user_profiles', u.id, patch, 'user_id'));
  },
  setStatus: async (id, status) => userFromRow(await updateRow('user_profiles', id, { status }, 'user_id')),
  remove: (id) => deleteRow('user_profiles', id, 'user_id'),
};

/* ══════════════ TESTS (diagnostic_tests) ══════════════ */
const testFromRow = (r) => ({
  id: r.id, name: r.name, category: r.category || 'Blood', price: r.price,
  time: r.report_hours ? `${r.report_hours} hrs` : '—',
  available: r.is_active !== false, popular: !!r.is_popular,
  fasting: r.fasting_required ? 'Fasting required' : 'No fasting required',
  prep: r.prep || 'None', description: r.description || '',
});
const testToRow = (t) => ({
  name: t.name, category: t.category, price: Number(t.price) || 0, mrp: Number(t.mrp || t.price) || 0,
  description: t.description || '', is_active: !!t.available, is_popular: !!t.popular,
  fasting_required: /fast/i.test(t.fasting || '') && !/^no/i.test(t.fasting || ''),
  report_hours: parseInt(t.time, 10) || 24, sample_type: t.sampleType || 'Blood',
  home_collection_available: true, slug: slugify(t.name),
  test_code: t.test_code || `LE-${slugify(t.name).slice(0, 5).toUpperCase()}${String(Date.now()).slice(-4)}`,
});
export const testsData = {
  load: async () => (await selectAll('diagnostic_tests', { order: 'name', ascending: true })).map(testFromRow),
  save: async (t) => isUuid(t.id)
    ? testFromRow(await updateRow('diagnostic_tests', t.id, testToRow(t)))
    : testFromRow(await insertRow('diagnostic_tests', testToRow(t))),
  setAvailable: async (id, available) => testFromRow(await updateRow('diagnostic_tests', id, { is_active: available })),
  remove: (id) => deleteRow('diagnostic_tests', id),
};

/* ══════════════ DOCTORS (doctors) ══════════════ */
const doctorFromRow = (r) => ({
  id: r.id,
  name: r.full_name,
  specialty: r.specialties?.name || '',
  specialtyId: r.specialty_id || '',
  qualifications: r.qualifications || '',
  experience: r.experience_years || 0,
  consultationFee: r.consultation_fee || 0,
  videoFee: r.video_fee || 0,
  gender: r.gender || '',
  city: r.city || '',
  clinic: r.clinic_name || '',
  languages: (r.languages || []).join(', '),
  about: r.about || '',
  photo: r.photo_url || '',
  rating: Number(r.rating) || 0,
  reviewCount: r.review_count || 0,
  verified: r.is_verified !== false,
  featured: !!r.is_featured,
  active: r.is_active !== false,
});
const doctorToRow = (d) => ({
  full_name: d.name,
  slug: slugify(d.name) + '-' + String(Date.now()).slice(-4),
  specialty_id: d.specialtyId || null,
  qualifications: d.qualifications || '',
  experience_years: Number(d.experience) || 0,
  consultation_fee: Number(d.consultationFee) || 0,
  video_fee: Number(d.videoFee) || 0,
  gender: d.gender || null,
  city: d.city || '',
  clinic_name: d.clinic || '',
  languages: (d.languages || '').split(',').map((s) => s.trim()).filter(Boolean),
  about: d.about || '',
  photo_url: d.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name || 'Dr')}&background=2563eb&color=fff&size=256&bold=true`,
  is_verified: d.verified !== false,
  is_featured: !!d.featured,
  is_active: d.active !== false,
  available_days: d.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  next_available: 'Today',
});
export const doctorsData = {
  load: async () =>
    (await selectAll('doctors', { order: 'full_name', ascending: true, select: '*, specialties(name)' })).map(doctorFromRow),
  specialties: async () =>
    (await selectAll('specialties', { order: 'name', ascending: true })).map((s) => ({ id: s.id, name: s.name })),
  save: async (d) => {
    if (isUuid(d.id)) {
      const row = doctorToRow(d);
      delete row.slug; // keep the existing slug on edit
      return doctorFromRow(await updateRow('doctors', d.id, row));
    }
    return doctorFromRow(await insertRow('doctors', doctorToRow(d)));
  },
  setActive: async (id, active) => doctorFromRow(await updateRow('doctors', id, { is_active: active })),
  remove: (id) => deleteRow('doctors', id),
};

/* ══════════════ CATEGORIES (test_categories) ══════════════ */
const catFromRow = (r) => ({ id: r.id, name: r.name, icon: r.icon || '🔬', color: r.color || '#1a6fc4', tests: 0 });
const catToRow = (c) => ({ name: c.name, icon: c.icon, color: c.color, slug: slugify(c.name), is_active: true });
export const categoriesData = {
  load: async () => (await selectAll('test_categories', { order: 'sort_order', ascending: true })).map(catFromRow),
  save: async (c) => isUuid(c.id)
    ? catFromRow(await updateRow('test_categories', c.id, catToRow(c)))
    : catFromRow(await insertRow('test_categories', catToRow(c))),
  remove: (id) => deleteRow('test_categories', id),
};

/* ══════════════ PACKAGES (health_packages) ══════════════ */
const pkgFromRow = (r) => ({
  id: r.id, name: r.name, tests: r.tests_count || 0, testList: [],
  price: r.price, originalPrice: r.mrp, active: r.is_active !== false, bookings: 0,
  description: r.description || '',
});
const pkgToRow = (p) => ({
  name: p.name, price: Number(p.price) || 0, mrp: Number(p.originalPrice || p.price) || 0,
  tests_count: Number(p.tests) || 0, description: p.description || '', is_active: !!p.active,
  slug: slugify(p.name), included_tests: p.includedTests || [], category: p.category || 'Full Body',
  ideal_for: p.idealFor || '', home_collection_available: true, fasting_required: false,
  report_hours: 24, is_popular: !!p.popular,
});
export const packagesData = {
  load: async () => (await selectAll('health_packages', { order: 'price', ascending: true })).map(pkgFromRow),
  save: async (p) => isUuid(p.id)
    ? pkgFromRow(await updateRow('health_packages', p.id, pkgToRow(p)))
    : pkgFromRow(await insertRow('health_packages', pkgToRow(p))),
  setActive: async (id, active) => pkgFromRow(await updateRow('health_packages', id, { is_active: active })),
  remove: (id) => deleteRow('health_packages', id),
};

/* ══════════════ BOOKINGS (booked_tests) ══════════════ */
const itemsSummary = (items) => {
  if (!Array.isArray(items) || !items.length) return 'Lab booking';
  const names = items.map((i) => i.name).filter(Boolean);
  return names[0] + (names.length > 1 ? ` +${names.length - 1} more` : '');
};
const bookingFromRow = (r) => ({
  id: r.id, ref: r.booking_ref || `#${String(r.id).slice(0, 6)}`,
  user: r.patient_name || '—', userId: r.user_id, test: itemsSummary(r.items),
  type: r.collection_type === 'home' ? 'home' : 'lab', date: fmtDate(r.scheduled_date),
  slot: r.scheduled_time || '', amount: Number(r.total_amount) || 0, status: r.status || 'pending',
  address: r.address || '', phlebotomist: r.assigned_phlebotomist || '', notes: '',
  patientPhone: r.patient_phone || '', paid: !!r.payment_collected,
});

// Fetch a patient's saved email + phone (for emailing / WhatsApping a
// report or prescription). Falls back gracefully to empty strings.
export async function patientContact(userId) {
  if (!userId) return { email: '', phone: '' };
  try {
    const { data } = await supabase
      .from('user_profiles').select('email, phone').eq('user_id', userId).maybeSingle();
    return { email: data?.email || '', phone: data?.phone || '' };
  } catch { return { email: '', phone: '' }; }
}
// Friendly patient-facing message for each booking status the admin sets.
const BOOKING_MSG = {
  confirmed: 'Your lab booking is confirmed. See you soon!',
  sample_collected: 'Your sample has been collected and sent to the lab.',
  processing: 'Your sample is being processed at the lab.',
  report_ready: 'Good news — your report is ready to view in your dashboard.',
  completed: 'Your booking is complete. Thank you for choosing LabEasy!',
  cancelled: 'Your lab booking has been cancelled. Any payment will be refunded in 3-5 working days.',
};
async function notifyUser(userId, title, message, type = 'info') {
  if (!userId) return;
  try { await supabase.from('notifications').insert({ user_id: userId, title, message, type, is_read: false }); }
  catch { /* non-fatal */ }
}

export const bookingsData = {
  load: async () => (await selectAll('booked_tests', { order: 'created_at' })).map(bookingFromRow),
  setStatus: async (id, status) => {
    const row = await updateRow('booked_tests', id, { status });
    if (BOOKING_MSG[status]) {
      await notifyUser(row.user_id, `Booking ${status.replace('_', ' ')}`, BOOKING_MSG[status], status === 'cancelled' ? 'warning' : 'success');
    }
    return bookingFromRow(row);
  },
  assign: async (id, name) => bookingFromRow(await updateRow('booked_tests', id, { assigned_phlebotomist: name })),
  collectPayment: async (id, collected) =>
    bookingFromRow(await updateRow('booked_tests', id, {
      payment_collected: collected,
      payment_collected_at: collected ? new Date().toISOString() : null,
    })),
  remove: (id) => deleteRow('booked_tests', id),
};

/* ══════════════ APPOINTMENTS (appointments) ══════════════ */
const APPT_MSG = {
  confirmed: 'Your doctor appointment is confirmed. See you soon!',
  completed: 'Your consultation is complete. Thank you for choosing LabEasy!',
  cancelled: 'Your appointment has been cancelled. Any payment will be refunded in 3-5 working days.',
};
const apptFromRow = (a) => ({
  id: a.id, ref: a.appointment_ref || `#${String(a.id).slice(0, 6)}`,
  user: a.patient_name || '—', userId: a.user_id,
  doctorId: a.doctor_id,
  doctor: a.doctors?.full_name || '—', specialty: a.doctors?.specialties?.name || '',
  date: fmtDate(a.appointment_date), time: a.appointment_time || '',
  type: a.consultation_type === 'video' ? 'video' : 'clinic',
  fee: Number(a.fee) || 0, status: a.status || 'pending',
  patientAge: a.patient_age || '', patientGender: a.patient_gender || '',
  patientPhone: a.patient_phone || '', symptoms: a.symptoms || '',
  paid: !!a.payment_collected,
});
export const appointmentsData = {
  load: async () =>
    (await selectAll('appointments', { order: 'created_at', select: '*, doctors(full_name, specialties(name))' })).map(apptFromRow),
  setStatus: async (id, status) => {
    const row = await updateRow('appointments', id, { status });
    if (APPT_MSG[status]) {
      await notifyUser(row.user_id, `Appointment ${status}`, APPT_MSG[status], status === 'cancelled' ? 'warning' : 'success');
    }
    return apptFromRow(row);
  },
  collectPayment: async (id, collected) =>
    apptFromRow(await updateRow('appointments', id, {
      payment_collected: collected,
      payment_collected_at: collected ? new Date().toISOString() : null,
    })),
  remove: (id) => deleteRow('appointments', id),
};

/* ══════════════ PRESCRIPTIONS (prescriptions) ══════════════ */
// Prescriptions mirror reports: admin uploads a PDF against a doctor
// appointment, the patient downloads it anytime from "My Prescriptions".
// PDFs live in the same private `reports` bucket (owner-folder policy).
const prescFromRow = (p) => ({
  id: p.id,
  appointmentId: p.appointment_id || null,
  userId: p.user_id,
  doctor: p.doctors?.full_name || '—',
  diagnosis: p.diagnosis || '',
  notes: p.notes || '',
  file: p.prescription_url || '',
  date: fmtDate(p.created_at),
});
export const prescriptionsData = {
  load: async () =>
    (await selectAll('prescriptions', { order: 'created_at', select: '*, doctors(full_name)' })).map(prescFromRow),
  // Admin upload: resolve the patient/doctor from the appointment, upload the
  // PDF to Storage, and save its path on a new prescription row.
  create: async ({ appointmentId, userId, doctorId, diagnosis, notes, file }) => {
    let user_id = userId || null, doctor_id = doctorId || null, appt_id = null;
    if (appointmentId) {
      const ref = String(appointmentId).trim();
      if (UUID.test(ref)) {
        const { data: ap } = await supabase
          .from('appointments').select('id, user_id, doctor_id').eq('id', ref).maybeSingle();
        if (ap) { user_id = ap.user_id; doctor_id = ap.doctor_id; appt_id = ap.id; }
      }
    }
    if (!user_id) throw new Error('A valid appointment is required to attach the prescription to a patient.');

    let prescription_url = null;
    if (file) prescription_url = await storageService.uploadPrescription(user_id, file);

    const row = {
      user_id, doctor_id, appointment_id: appt_id,
      diagnosis: diagnosis || null, notes: notes || null, prescription_url,
    };
    return prescFromRow(await insertRow('prescriptions', row));
  },
  // Replace / edit an existing prescription — upload a new PDF if one is given.
  replace: async (prescId, { diagnosis, notes, file, userId }) => {
    const patch = { diagnosis: diagnosis || null, notes: notes || null };
    if (file) patch.prescription_url = await storageService.uploadPrescription(userId, file);
    return prescFromRow(await updateRow('prescriptions', prescId, patch));
  },
  downloadUrl: (pathOrUrl) => storageService.reportUrl(pathOrUrl),
  remove: (id) => deleteRow('prescriptions', id),
};

/* ══════════════ REPORTS (medical_reports) ══════════════ */
const reportFromRow = (r) => ({
  id: r.id, ref: r.report_ref || `#${String(r.id).slice(0, 6)}`,
  bookingId: r.booked_tests?.booking_ref || (r.booking_id ? `#${String(r.booking_id).slice(0, 6)}` : '—'),
  bookingRawId: r.booking_id || null,   // raw UUID, used to match a booking to its report
  patient: r.notes || '—', test: r.title || 'Report',
  date: fmtDate(r.created_at), uploadedBy: r.signed_by || 'LabEasy',
  status: r.is_verified ? 'verified' : (r.status || 'pending'), file: r.report_url || '',
});
// Map the screen's status labels onto the DB's report_status enum.
const REPORT_STATUS_MAP = { verified: 'verified', pending: 'pending', flagged: 'processing', processing: 'processing', signed: 'signed' };
export const reportsData = {
  load: async () => (await selectAll('medical_reports', { order: 'created_at' })).map(reportFromRow),
  setStatus: async (id, uiStatus) => {
    const status = REPORT_STATUS_MAP[uiStatus] || 'pending';
    return reportFromRow(await updateRow('medical_reports', id, { status, is_verified: status === 'verified' }));
  },
  // Admin upload: resolve the owning user from the booking reference
  // (accepts either the friendly BK01 ref or the raw UUID), upload the PDF
  // to Supabase Storage, and save the object path on the report row.
  create: async ({ bookingId, patient, test, lab, notes, file }) => {
    let user_id = null;
    let booking_id = null;
    if (bookingId) {
      const ref = String(bookingId).trim();
      let bk = null;
      // Resolve by the real UUID first (what the Bookings/Reports rows pass);
      // only fall back to the friendly BK01 ref, which may not exist on older DBs.
      if (UUID.test(ref)) {
        ({ data: bk } = await supabase.from('booked_tests').select('id, user_id').eq('id', ref).maybeSingle());
      }
      if (!bk) {
        const res = await supabase.from('booked_tests').select('id, user_id').eq('booking_ref', ref).maybeSingle();
        bk = res.data;
      }
      if (!bk) throw new Error('No booking found with that reference. Paste a valid Booking ID (e.g. BK01).');
      user_id = bk.user_id; booking_id = bk.id;
    }
    if (!user_id) throw new Error('A valid Booking ID is required to attach the report to a patient.');

    // Upload the PDF (if provided) to the private reports bucket.
    let report_url = null;
    if (file) {
      report_url = await storageService.uploadReport(user_id, file);
    }

    const row = {
      user_id, booking_id, title: test || 'Lab Report', status: 'pending',
      is_verified: false, signed_by: lab || 'Admin Upload', notes: patient || notes || '',
      report_url,
    };
    return reportFromRow(await insertRow('medical_reports', row));
  },
  // Replace / edit an existing report: upload a new file if one is given,
  // otherwise just update the details. Keeps the same report row.
  replace: async (reportId, { patient, test, lab, notes, file, userId }) => {
    const patch = {
      title: test || 'Lab Report',
      signed_by: lab || 'Admin Upload',
      notes: patient || notes || '',
    };
    if (file) patch.report_url = await storageService.uploadReport(userId, file);
    return reportFromRow(await updateRow('medical_reports', reportId, patch));
  },
  // Signed download URL for a stored report path.
  downloadUrl: (pathOrUrl) => storageService.reportUrl(pathOrUrl),
  remove: (id) => deleteRow('medical_reports', id),
};

/* ══════════════ STAFF (staff) ══════════════ */
const staffFromRow = (r) => ({
  id: r.id, ref: r.staff_ref || `#${String(r.id).slice(0, 6)}`,
  name: r.name, phone: r.phone || '', email: r.email || '', zone: r.zone || '',
  totalCollections: r.total_collections || 0, rating: r.rating || 5, status: r.status || 'active',
  today: r.today_count || 0, joinDate: r.join_date || '',
});
const staffToRow = (s) => ({
  name: s.name, phone: s.phone, email: s.email, zone: s.zone,
  total_collections: Number(s.totalCollections) || 0, rating: Number(s.rating) || 5,
  today_count: Number(s.today) || 0, status: s.status || 'active', join_date: s.joinDate || '',
});
export const staffData = {
  load: async () => (await selectAll('staff', { order: 'name', ascending: true })).map(staffFromRow),
  save: async (s) => isUuid(s.id)
    ? staffFromRow(await updateRow('staff', s.id, staffToRow(s)))
    : staffFromRow(await insertRow('staff', staffToRow(s))),
  remove: (id) => deleteRow('staff', id),
};

/* ══════════════ TICKETS (contact_messages) ══════════════ */
const ticketFromRow = (r) => ({
  id: r.id, ref: r.ticket_ref || `#${String(r.id).slice(0, 6)}`,
  user: r.name || '—', subject: r.subject || '(no subject)',
  priority: r.priority || 'medium', status: r.status === 'new' ? 'open' : (r.status || 'open'),
  date: fmtDate(r.created_at), email: r.email || '', phone: r.phone || '',
  messages: [
    { from: 'user', text: r.message || '', time: '' },
    ...(r.admin_reply ? [{ from: 'admin', text: r.admin_reply, time: '' }] : []),
  ],
});
export const ticketsData = {
  load: async () => (await selectAll('contact_messages', { order: 'created_at' })).map(ticketFromRow),
  reply: async (id, reply, status = 'resolved') =>
    ticketFromRow(await updateRow('contact_messages', id, { admin_reply: reply, status })),
  setStatus: async (id, status) => ticketFromRow(await updateRow('contact_messages', id, { status })),
};

/* ══════════════ PAYMENTS (payments) ══════════════ */
const paymentFromRow = (r) => ({
  id: r.id, ref: r.payment_ref || `#${String(r.id).slice(0, 6)}`,
  bookingId: r.booked_tests?.booking_ref
    || (r.booked_test_id || r.appointment_id ? `#${String(r.booked_test_id || r.appointment_id).slice(0, 6)}` : '—'),
  user: '—',
  amount: Number(r.amount) || 0, method: r.method || '—',
  // The screen uses 'success'; the DB enum uses 'successful'.
  status: r.status === 'successful' ? 'success' : (r.status || 'pending'),
  date: fmtDate(r.created_at), txnId: r.transaction_ref || r.id?.slice(0, 8) || '',
});
export const paymentsData = {
  load: async () => (await selectAll('payments', { order: 'created_at' })).map(paymentFromRow),
  setStatus: async (id, status) => {
    const dbStatus = status === 'success' ? 'successful' : status;
    return paymentFromRow(await updateRow('payments', id, { status: dbStatus }));
  },
};

/* ══════════════ BANNERS (banners) ══════════════ */
const bannerFromRow = (r) => ({
  id: r.id, title: r.title, subtitle: r.subtitle || '', image: r.image || '🏥',
  active: r.is_active !== false, order: r.sort_order || 0, link: r.link || '',
});
const bannerToRow = (b) => ({
  title: b.title, subtitle: b.subtitle, image: b.image, link: b.link,
  is_active: !!b.active, sort_order: Number(b.order) || 0,
});
export const bannersData = {
  load: async () => (await selectAll('banners', { order: 'sort_order', ascending: true })).map(bannerFromRow),
  save: async (b) => isUuid(b.id)
    ? bannerFromRow(await updateRow('banners', b.id, bannerToRow(b)))
    : bannerFromRow(await insertRow('banners', bannerToRow(b))),
  remove: (id) => deleteRow('banners', id),
};

/* ══════════════ COUPONS (coupons) ══════════════ */
const couponFromRow = (r) => ({
  id: r.id, code: r.code, discount: r.discount, type: r.type || 'percent',
  minOrder: r.min_order || 0, usageCount: r.usage_count || 0, maxUsage: r.max_usage || 0,
  expiry: r.expiry || '', active: r.is_active !== false,
});
const couponToRow = (c) => ({
  code: c.code, discount: Number(c.discount) || 0, type: c.type || 'percent',
  min_order: Number(c.minOrder) || 0, max_usage: Number(c.maxUsage) || 0,
  expiry: c.expiry || null, is_active: !!c.active,
});
export const couponsData = {
  load: async () => (await selectAll('coupons', { order: 'created_at' })).map(couponFromRow),
  save: async (c) => isUuid(c.id)
    ? couponFromRow(await updateRow('coupons', c.id, couponToRow(c)))
    : couponFromRow(await insertRow('coupons', couponToRow(c))),
  remove: (id) => deleteRow('coupons', id),
};

/* ══════════════ ADMINS / ROLES (user_profiles) ══════════════ */
const adminFromRow = (r) => ({
  id: r.user_id, name: r.full_name || '—', email: r.email || '', role: 'Admin',
  status: r.status || 'active', lastLogin: '—', phone: r.phone || '',
});
export const adminsData = {
  load: async () => {
    const { data, error } = await supabase.from('user_profiles').select('*').eq('role', 'admin');
    if (error) throw error;
    return (data || []).map(adminFromRow);
  },
  // Grant admin to an existing registered user (by email).
  promoteByEmail: async (email) => {
    const { data, error } = await supabase
      .from('user_profiles').update({ role: 'admin' }).eq('email', email).select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No registered user with that email. Ask them to sign up first, then add them here.');
    return adminFromRow(data);
  },
  setStatus: async (id, status) => adminFromRow(await updateRow('user_profiles', id, { status }, 'user_id')),
  // Revoke admin (demote back to patient) rather than deleting the account.
  demote: (id) => updateRow('user_profiles', id, { role: 'patient' }, 'user_id'),
};

/* ══════════════ NOTIFICATIONS (broadcast) ══════════════ */
export const notificationsData = {
  load: async () => selectAll('notifications', { order: 'created_at' }),
  broadcast: async ({ title, message, type = 'info' }) => {
    const { data: users, error } = await supabase.from('user_profiles').select('user_id');
    if (error) throw error;
    const rows = (users || []).map((u) => ({ user_id: u.user_id, title, message, type, is_read: false }));
    if (!rows.length) return 0;
    const { error: insErr } = await supabase.from('notifications').insert(rows);
    if (insErr) throw insErr;
    return rows.length;
  },
};

/* ══════════════ SIDEBAR BADGE COUNTS ══════════════ */
export async function sidebarCounts() {
  const [bk, ap, rp, tk] = await Promise.all([
    supabase.from('booked_tests').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count || 0).catch(() => 0),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(r => r.count || 0).catch(() => 0),
    supabase.from('medical_reports').select('id', { count: 'exact', head: true }).eq('is_verified', false).then(r => r.count || 0).catch(() => 0),
    supabase.from('contact_messages').select('id', { count: 'exact', head: true }).neq('status', 'resolved').then(r => r.count || 0).catch(() => 0),
  ]);
  return { bookings: bk, appointments: ap, reports: rp, support: tk };
}

/* ══════════════ CSV EXPORT ══════════════ */
export function exportCSV(filename, headers, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ══════════════ REVIEWS / FEEDBACK ══════════════ */
export const reviewsData = {
  load: async () => {
    const { data, error } = await supabase
      .from('reviews').select('*, doctors(full_name)').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r) => ({
      id: r.id, name: r.reviewer_name || 'Anonymous', stars: r.rating || 0,
      text: r.comment || '', date: fmtDate(r.created_at), doctor: r.doctors?.full_name || '',
      approved: r.is_approved !== false,
    }));
  },
};

/* ══════════════ DASHBOARD / ANALYTICS ══════════════ */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dashboardData = {
  async load() {
    const [users, bookings, appointments, reports] = await Promise.all([
      selectAll('user_profiles', { order: 'created_at' }).catch(() => []),
      selectAll('booked_tests', { order: 'created_at' }).catch(() => []),
      selectAll('appointments', { order: 'created_at' }).catch(() => []),
      selectAll('medical_reports', { order: 'created_at' }).catch(() => []),
    ]);

    // Revenue = cash ACTUALLY collected — same source as the Cash Collection
    // page (payment_collected flag on lab bookings + doctor appointments).
    const bookingCash = bookings
      .filter((b) => b.payment_collected)
      .reduce((s, b) => s + Number(b.total_amount || 0), 0);
    const apptCash = appointments
      .filter((a) => a.payment_collected)
      .reduce((s, a) => s + Number(a.fee || 0), 0);
    const revenue = bookingCash + apptCash;

    // Registered users = patients only (admins are not "users")
    const patients = users.filter((u) => u.role !== 'admin');
    const pendingReports = reports.filter((r) => !r.is_verified).length;

    // bookings per weekday
    const byDay = Array(7).fill(0);
    bookings.forEach((b) => { const d = new Date(b.created_at); if (!isNaN(d)) byDay[d.getDay()]++; });
    const chartBookings = WEEKDAYS.map((label, i) => ({ label, val: byDay[i] }));

    // cash collected per month (thousands) — booked tests + appointments
    const byMonth = Array(12).fill(0);
    const addMonth = (row, amountField) => {
      if (!row.payment_collected) return;
      const d = new Date(row.payment_collected_at || row.created_at);
      if (!isNaN(d)) byMonth[d.getMonth()] += Number(row[amountField] || 0);
    };
    bookings.forEach((b) => addMonth(b, 'total_amount'));
    appointments.forEach((a) => addMonth(a, 'fee'));
    const chartRevenue = MONTHS.map((label, i) => ({ label, val: Math.round(byMonth[i] / 1000) }));

    return {
      stats: {
        bookings: bookings.length,
        revenue,
        users: patients.length,
        pendingReports,
      },
      recentBookings: bookings.slice(0, 5).map(bookingFromRow),
      chartBookings,
      chartRevenue,
    };
  },
};
