import { supabase } from '../supabase/supabase.js';
import { BOOKING_STATUS } from '../constants/index.js';
import { notificationService } from './notificationService.js';

/**
 * Diagnostic tests, health packages and lab bookings.
 * Supabase tables: diagnostic_tests, health_packages, test_categories, booked_tests.
 */

const testFromRow = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  code: row.test_code,
  category: row.category,
  price: row.price,
  mrp: row.mrp,
  sampleType: row.sample_type,
  fastingRequired: row.fasting_required,
  reportHours: row.report_hours,
  homeCollection: row.home_collection_available,
  popular: row.is_popular,
  description: row.description,
});

const packageFromRow = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  price: row.price,
  mrp: row.mrp,
  testsCount: row.tests_count,
  category: row.category,
  popular: row.is_popular,
  fastingRequired: row.fasting_required,
  reportHours: row.report_hours,
  homeCollection: row.home_collection_available,
  idealFor: row.ideal_for,
  description: row.description,
  includedTests: row.included_tests || [],
});

export const diagnosticService = {
  // ---------------- catalogue ----------------
  async getAllTests() {
    const { data, error } = await supabase
      .from('diagnostic_tests')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data.map(testFromRow);
  },

  async getPopularTests() {
    const all = await this.getAllTests();
    return all.filter((t) => t.popular).slice(0, 8);
  },

  async getTestBySlug(slug) {
    const all = await this.getAllTests();
    return all.find((t) => t.slug === slug) || null;
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('test_categories')
      .select('name')
      .order('sort_order');
    if (error) throw error;
    return data.map((c) => c.name);
  },

  async searchTests({ query = '', category = '' } = {}) {
    const all = await this.getAllTests();
    const q = query.toLowerCase();
    return all.filter((t) => {
      if (category && t.category !== category) return false;
      if (q && !`${t.name} ${t.category} ${t.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  },

  async getAllPackages() {
    const { data, error } = await supabase
      .from('health_packages')
      .select('*')
      .eq('is_active', true)
      .order('price');
    if (error) throw error;
    return data.map(packageFromRow);
  },

  async getPopularPackages() {
    const all = await this.getAllPackages();
    return all.filter((p) => p.popular).slice(0, 4);
  },

  async getPackageBySlug(slug) {
    const all = await this.getAllPackages();
    return all.find((p) => p.slug === slug) || null;
  },

  // ---------------- bookings ----------------
  /**
   * payload: { userId, items: [{id, name, price, type: 'test'|'package'}],
   *            collectionType: 'home'|'lab', date, time, patientName, patientAge,
   *            patientGender, patientPhone, address, city, pincode, totalAmount }
   */
  async bookTests(payload) {
    const record = {
      user_id: payload.userId,
      items: payload.items,
      collection_type: payload.collectionType,
      scheduled_date: payload.date,
      scheduled_time: payload.time,
      patient_name: payload.patientName,
      patient_age: payload.patientAge,
      patient_gender: payload.patientGender,
      patient_phone: payload.patientPhone,
      address: payload.address || '',
      city: payload.city || '',
      pincode: payload.pincode || '',
      total_amount: payload.totalAmount,
      // New bookings arrive as a request; an admin reviews and confirms them.
      status: BOOKING_STATUS.PENDING,
    };

    const { data: saved, error } = await supabase.from('booked_tests').insert(record).select().single();
    if (error) throw error;

    await notificationService.create({
      userId: payload.userId,
      type: 'booking_requested',
      title: 'Booking Request Received',
      message: `Booking ${saved.booking_ref || ''} received — your ${payload.collectionType === 'home' ? 'home sample collection' : 'lab visit'} for ${payload.date} at ${payload.time} is pending confirmation.`.replace('  ', ' '),
    });

    return saved;
  },

  async getMyBookings(userId) {
    const { data, error } = await supabase
      .from('booked_tests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async cancelBooking(id, userId) {
    const { error } = await supabase
      .from('booked_tests')
      .update({ status: BOOKING_STATUS.CANCELLED })
      .eq('id', id);
    if (error) throw error;
    await notificationService.create({
      userId,
      type: 'booking_cancelled',
      title: 'Lab Booking Cancelled',
      message: 'Your diagnostic booking has been cancelled. Refund (if paid) arrives in 3-5 working days.',
    });
    return true;
  },

  // ---------------- reports & prescriptions ----------------
  async getMyReports(userId) {
    const { data, error } = await supabase
      .from('medical_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getMyPrescriptions(userId) {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, doctors(full_name, specialties(name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((p) => ({
      ...p,
      doctor_name: p.doctors?.full_name,
      specialty: p.doctors?.specialties?.name,
    }));
  },
};
