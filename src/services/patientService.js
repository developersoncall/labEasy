import { supabase } from '../supabase/supabase.js';

/**
 * The laboratory's patient register.
 *
 * A patient belongs to exactly one lab. The same person visiting two labs is
 * two records, which is correct: each lab holds its own file and its own
 * consent, and nothing about this platform should let one lab read another's
 * patients.
 *
 * The register fills itself. A booking taken at the counter creates or matches
 * a patient through the `attach_booking_patient` trigger, so a receptionist who
 * never opens this screen still builds a usable history — and the next time
 * they start typing a name, the person is already there.
 */

/** Phase 2 tables only arrive with phase2.sql. */
const isMissingSchema = (err) => {
  const msg = err?.message || '';
  return (
    ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(err?.code) ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
};

const FIELDS =
  'id, lab_id, patient_ref, full_name, phone, phone_key, email, dob, age, gender, ' +
  'blood_group, address, city, pincode, notes, visits, last_visit_at, is_active, created_at';

/** Last ten digits — the same key the database matches on. */
export const phoneKey = (phone = '') => String(phone).replace(/\D/g, '').slice(-10);

/**
 * Age in whole years, preferring a date of birth over a recorded age.
 *
 * A stored age is a fact about the day it was written down; a date of birth
 * stays true. Reference ranges depend on this, so it is worth being exact.
 */
export function ageOf(patient) {
  if (patient?.dob) {
    const dob = new Date(patient.dob);
    if (!Number.isNaN(dob.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
      return years;
    }
  }
  return patient?.age ?? null;
}

/** What a booking form needs, from a patient record. */
export const toBookingForm = (p) => ({
  patientId: p.id,
  patientName: p.full_name || '',
  patientPhone: p.phone || '',
  patientEmail: p.email || '',
  patientAge: ageOf(p) == null ? '' : String(ageOf(p)),
  patientGender: p.gender || '',
  address: p.address || '',
  city: p.city || '',
});

export const patientService = {
  /**
   * Type-ahead for the booking counter.
   *
   * Matches a name fragment or any part of a phone number, because a
   * receptionist with the patient in front of them will use whichever they
   * were given. Ordered by most recently seen, so the regular who came last
   * week is the first suggestion.
   */
  async search(labId, term, { limit = 8 } = {}) {
    const q = String(term || '').trim();
    if (!labId || q.length < 2) return { patients: [], schemaMissing: false };

    const digits = q.replace(/\D/g, '');
    const filters = [`full_name.ilike.%${q}%`];
    if (digits.length >= 3) filters.push(`phone.ilike.%${digits}%`);

    const { data, error } = await supabase
      .from('patients')
      .select(FIELDS)
      .eq('lab_id', labId)
      .eq('is_active', true)
      .or(filters.join(','))
      .order('last_visit_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      if (isMissingSchema(error)) return { patients: [], schemaMissing: true };
      throw error;
    }
    return { patients: data || [], schemaMissing: false };
  },

  /** The register, newest visitors first. */
  async list(labId, { search, limit = 200 } = {}) {
    let q = supabase
      .from('patients')
      .select(FIELDS)
      .eq('lab_id', labId)
      .order('last_visit_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    const term = String(search || '').trim();
    if (term) {
      const digits = term.replace(/\D/g, '');
      const filters = [`full_name.ilike.%${term}%`, `patient_ref.ilike.%${term}%`];
      if (digits.length >= 3) filters.push(`phone.ilike.%${digits}%`);
      q = q.or(filters.join(','));
    }

    const { data, error } = await q;
    if (error) {
      if (isMissingSchema(error)) return { patients: [], schemaMissing: true };
      throw error;
    }
    return { patients: data || [], schemaMissing: false };
  },

  async get(id) {
    const { data, error } = await supabase.from('patients').select(FIELDS).eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  /** Everything this patient has ever been booked for, with any report. */
  async history(patientId) {
    const { data, error } = await supabase
      .from('booked_tests')
      .select(
        'id, booking_ref, bill_no, items, scheduled_date, workflow_status, payment_status, ' +
          'total_amount, amount_paid, created_at, ' +
          'medical_reports:medical_reports!medical_reports_booking_id_fkey ( id, report_ref, file_path, file_name, status, created_at )',
      )
      .eq('patient_id', patientId)
      .order('scheduled_date', { ascending: false })
      .limit(100);

    // The embedded report join needs the FK to be named as PostgREST expects;
    // if the relationship cannot be resolved, the bookings still matter more
    // than the attachment, so fall back to them alone.
    if (error) {
      const { data: plain, error: plainErr } = await supabase
        .from('booked_tests')
        .select(
          'id, booking_ref, bill_no, items, scheduled_date, workflow_status, ' +
            'payment_status, total_amount, amount_paid, created_at',
        )
        .eq('patient_id', patientId)
        .order('scheduled_date', { ascending: false })
        .limit(100);
      if (plainErr) throw plainErr;
      return plain || [];
    }
    return data || [];
  },

  async create(labId, patient) {
    const { data, error } = await supabase
      .from('patients')
      .insert({
        lab_id: labId,
        full_name: patient.fullName || patient.full_name || '',
        phone: patient.phone || '',
        email: patient.email || '',
        dob: patient.dob || null,
        age: patient.age === '' || patient.age == null ? null : Number(patient.age),
        gender: patient.gender || null,
        blood_group: patient.bloodGroup || '',
        address: patient.address || '',
        city: patient.city || '',
        pincode: patient.pincode || '',
        notes: patient.notes || '',
      })
      .select(FIELDS)
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new Error('A patient with that phone number is already registered at this lab.');
      }
      throw error;
    }
    return data;
  },

  async update(id, patch) {
    const row = {};
    const map = {
      fullName: 'full_name', phone: 'phone', email: 'email', dob: 'dob', age: 'age',
      gender: 'gender', bloodGroup: 'blood_group', address: 'address', city: 'city',
      pincode: 'pincode', notes: 'notes', isActive: 'is_active',
    };
    Object.entries(patch).forEach(([k, v]) => {
      const col = map[k];
      if (!col) return;
      row[col] = col === 'age' ? (v === '' || v == null ? null : Number(v)) : v;
    });
    if (row.dob === '') row.dob = null;
    if (row.gender === '') row.gender = null;

    const { data, error } = await supabase
      .from('patients')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(FIELDS)
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new Error('Another patient at this lab already uses that phone number.');
      }
      throw error;
    }
    return data;
  },

  /** Counts for the dashboard: how many on the register, how many new today. */
  async stats(labId) {
    const today = new Date().toLocaleDateString('en-CA');
    const [{ count: total }, { count: newToday }] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }).eq('lab_id', labId),
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('lab_id', labId)
        .gte('created_at', `${today}T00:00:00`),
    ]);
    return { total: total || 0, newToday: newToday || 0 };
  },
};

export default patientService;
