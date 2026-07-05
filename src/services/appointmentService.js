import { supabase } from '../supabase/supabase.js';
import { APPOINTMENT_STATUS } from '../constants/index.js';
import { notificationService } from './notificationService.js';

/**
 * Appointment booking operations.
 * Supabase table: appointments.
 */
export const appointmentService = {
  /**
   * payload: { userId, doctorId, doctorName, doctorPhoto, specialty, date, time,
   *            consultationType, fee, patientName, patientAge, patientGender,
   *            patientPhone, symptoms }
   */
  async book(payload) {
    const record = {
      user_id: payload.userId,
      doctor_id: payload.doctorId,
      appointment_date: payload.date,
      appointment_time: payload.time,
      consultation_type: payload.consultationType,
      fee: payload.fee,
      patient_name: payload.patientName,
      patient_age: payload.patientAge,
      patient_gender: payload.patientGender,
      patient_phone: payload.patientPhone,
      symptoms: payload.symptoms || '',
      // Appointments come in as a request; the clinic admin confirms them.
      status: APPOINTMENT_STATUS.PENDING,
    };

    const { data: saved, error } = await supabase.from('appointments').insert(record).select().single();
    if (error) throw error;

    await notificationService.create({
      userId: payload.userId,
      type: 'appointment_requested',
      title: 'Appointment Request Received',
      message: `Appointment ${saved.appointment_ref || ''} — your ${payload.consultationType === 'video' ? 'video consultation' : 'clinic visit'} with ${payload.doctorName} for ${payload.date} at ${payload.time} is pending confirmation.`.replace('  ', ' '),
    });

    return saved;
  },

  async getMyAppointments(userId) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, doctors(full_name, photo_url, specialties(name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((a) => ({
      ...a,
      doctor_name: a.doctors?.full_name,
      doctor_photo: a.doctors?.photo_url,
      specialty: a.doctors?.specialties?.name,
    }));
  },

  async getById(id, userId) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, doctors(full_name, photo_url, clinic_name, specialties(name))')
      .eq('id', id)
      .single();
    if (error) throw error;
    return {
      ...data,
      doctor_name: data.doctors?.full_name,
      doctor_photo: data.doctors?.photo_url,
      clinic: data.doctors?.clinic_name,
      specialty: data.doctors?.specialties?.name,
    };
  },

  async cancel(id, userId) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: APPOINTMENT_STATUS.CANCELLED })
      .eq('id', id);
    if (error) throw error;
    await notificationService.create({
      userId,
      type: 'appointment_cancelled',
      title: 'Appointment Cancelled',
      message: 'Your appointment has been cancelled. Any payment made will be refunded in 3-5 working days.',
    });
    return true;
  },

  async reschedule(id, userId, { date, time }) {
    const { error } = await supabase
      .from('appointments')
      .update({ appointment_date: date, appointment_time: time, status: APPOINTMENT_STATUS.CONFIRMED })
      .eq('id', id);
    if (error) throw error;
    await notificationService.create({
      userId,
      type: 'appointment_rescheduled',
      title: 'Appointment Rescheduled',
      message: `Your appointment has been moved to ${date} at ${time}.`,
    });
    return true;
  },
};
