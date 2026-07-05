import { supabase } from '../supabase/supabase.js';

/**
 * Admin-panel data layer. Every function talks to Supabase directly.
 * Writes succeed only for users whose user_profiles.role = 'admin'
 * (enforced by the "admin full access" RLS policies in admin_setup.sql).
 *
 * Generic CRUD helpers keep the individual entity methods tiny.
 */

const list = async (table, { order = 'created_at', ascending = false, select = '*' } = {}) => {
  let q = supabase.from(table).select(select);
  if (order) q = q.order(order, { ascending });
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

const insert = async (table, row) => {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
};

const update = async (table, id, patch) => {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

const remove = async (table, id) => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const adminService = {
  // expose generics for ad-hoc use
  list, insert, update, remove,

  // ---------------- Dashboard / analytics ----------------
  async getStats() {
    const tables = [
      'user_profiles', 'doctors', 'diagnostic_tests', 'health_packages',
      'appointments', 'booked_tests', 'medical_reports', 'payments', 'contact_messages',
    ];
    const results = await Promise.all(
      tables.map((t) =>
        supabase.from(t).select('*', { count: 'exact', head: true }).then(({ count }) => count || 0)
      )
    );
    const [users, doctors, tests, packages, appointments, bookings, reports, payments, tickets] = results;

    // revenue from successful payments
    let revenue = 0;
    const { data: pays } = await supabase.from('payments').select('amount, status');
    (pays || []).forEach((p) => {
      if (p.status === 'success' || p.status === 'successful') revenue += Number(p.amount || 0);
    });

    return { users, doctors, tests, packages, appointments, bookings, reports, payments, tickets, revenue };
  },

  // ---------------- Users ----------------
  getUsers: () => list('user_profiles', { order: 'created_at' }),
  updateUserStatus: (userId, status) =>
    supabase.from('user_profiles').update({ status }).eq('user_id', userId).select().single()
      .then(({ data, error }) => { if (error) throw error; return data; }),
  updateUserRole: (userId, role) =>
    supabase.from('user_profiles').update({ role }).eq('user_id', userId).select().single()
      .then(({ data, error }) => { if (error) throw error; return data; }),

  // ---------------- Doctors ----------------
  getDoctors: () => list('doctors', { order: 'full_name', ascending: true, select: '*, specialties(name)' }),
  createDoctor: (row) => insert('doctors', row),
  updateDoctor: (id, patch) => update('doctors', id, patch),
  deleteDoctor: (id) => remove('doctors', id),

  // ---------------- Specialties ----------------
  getSpecialties: () => list('specialties', { order: 'name', ascending: true }),
  createSpecialty: (row) => insert('specialties', row),
  updateSpecialty: (id, patch) => update('specialties', id, patch),
  deleteSpecialty: (id) => remove('specialties', id),

  // ---------------- Test categories ----------------
  getCategories: () => list('test_categories', { order: 'sort_order', ascending: true }),
  createCategory: (row) => insert('test_categories', row),
  updateCategory: (id, patch) => update('test_categories', id, patch),
  deleteCategory: (id) => remove('test_categories', id),

  // ---------------- Diagnostic tests ----------------
  getTests: () => list('diagnostic_tests', { order: 'name', ascending: true }),
  createTest: (row) => insert('diagnostic_tests', row),
  updateTest: (id, patch) => update('diagnostic_tests', id, patch),
  deleteTest: (id) => remove('diagnostic_tests', id),

  // ---------------- Health packages ----------------
  getPackages: () => list('health_packages', { order: 'price', ascending: true }),
  createPackage: (row) => insert('health_packages', row),
  updatePackage: (id, patch) => update('health_packages', id, patch),
  deletePackage: (id) => remove('health_packages', id),

  // ---------------- Bookings (lab) ----------------
  getBookings: () => list('booked_tests', { order: 'created_at' }),
  updateBooking: (id, patch) => update('booked_tests', id, patch),

  // ---------------- Appointments ----------------
  getAppointments: () =>
    list('appointments', { order: 'created_at', select: '*, doctors(full_name, specialties(name))' }),
  updateAppointment: (id, patch) => update('appointments', id, patch),

  // ---------------- Reports ----------------
  getReports: () => list('medical_reports', { order: 'created_at' }),
  createReport: (row) => insert('medical_reports', row),
  updateReport: (id, patch) => update('medical_reports', id, patch),
  deleteReport: (id) => remove('medical_reports', id),

  // ---------------- Payments ----------------
  getPayments: () => list('payments', { order: 'created_at' }),
  updatePayment: (id, patch) => update('payments', id, patch),

  // ---------------- Reviews / feedback ----------------
  getReviews: () => list('reviews', { order: 'created_at', select: '*, doctors(full_name)' }),
  updateReview: (id, patch) => update('reviews', id, patch),
  deleteReview: (id) => remove('reviews', id),

  // ---------------- Support tickets (contact_messages) ----------------
  getTickets: () => list('contact_messages', { order: 'created_at' }),
  updateTicket: (id, patch) => update('contact_messages', id, patch),

  // ---------------- Notifications (broadcast) ----------------
  getNotifications: () => list('notifications', { order: 'created_at' }),
  createNotification: (row) => insert('notifications', row),
  /** Send a notification to every user (or a single user_id). */
  async broadcast({ title, message, type = 'info', userId = null }) {
    if (userId) return insert('notifications', { user_id: userId, title, message, type, is_read: false });
    const { data: users, error } = await supabase.from('user_profiles').select('user_id');
    if (error) throw error;
    const rows = (users || []).map((u) => ({ user_id: u.user_id, title, message, type, is_read: false }));
    if (!rows.length) return true;
    const { error: insErr } = await supabase.from('notifications').insert(rows);
    if (insErr) throw insErr;
    return true;
  },

  // ---------------- Blogs (CMS) ----------------
  getBlogs: () => list('blogs', { order: 'published_at' }),
  createBlog: (row) => insert('blogs', row),
  updateBlog: (id, patch) => update('blogs', id, patch),
  deleteBlog: (id) => remove('blogs', id),

  // ---------------- FAQs ----------------
  getFaqs: () => list('faqs', { order: 'sort_order', ascending: true }),
  createFaq: (row) => insert('faqs', row),
  updateFaq: (id, patch) => update('faqs', id, patch),
  deleteFaq: (id) => remove('faqs', id),

  // ---------------- Testimonials ----------------
  getTestimonials: () => list('testimonials', { order: 'sort_order', ascending: true }),
  createTestimonial: (row) => insert('testimonials', row),
  updateTestimonial: (id, patch) => update('testimonials', id, patch),
  deleteTestimonial: (id) => remove('testimonials', id),

  // ---------------- Banners ----------------
  getBanners: () => list('banners', { order: 'sort_order', ascending: true }),
  createBanner: (row) => insert('banners', row),
  updateBanner: (id, patch) => update('banners', id, patch),
  deleteBanner: (id) => remove('banners', id),

  // ---------------- Coupons ----------------
  getCoupons: () => list('coupons', { order: 'created_at' }),
  createCoupon: (row) => insert('coupons', row),
  updateCoupon: (id, patch) => update('coupons', id, patch),
  deleteCoupon: (id) => remove('coupons', id),

  // ---------------- Staff / phlebotomists ----------------
  getStaff: () => list('staff', { order: 'name', ascending: true }),
  createStaff: (row) => insert('staff', row),
  updateStaff: (id, patch) => update('staff', id, patch),
  deleteStaff: (id) => remove('staff', id),
};
