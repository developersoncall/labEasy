import { useState } from 'react';
import Modal from '../../components/common/Modal.jsx';
import { patientService } from '../../services/patientService.js';
import { Alert } from './ui.jsx';

/**
 * Register a patient before they have a booking, or correct one afterwards.
 *
 * Most patients arrive through a booking and never need this screen. It exists
 * for the two cases that do: a pre-registration taken over the phone, and
 * fixing a phone number that was mistyped at the counter — which matters,
 * because the phone number is what matches this person on their next visit.
 */
const empty = {
  fullName: '', phone: '', email: '', dob: '', age: '', gender: '',
  bloodGroup: '', address: '', city: '', pincode: '', notes: '',
};

const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];

export default function PatientEditor({ labId, patient, onClose, onSaved }) {
  const [form, setForm] = useState(
    patient
      ? {
        fullName: patient.full_name || '',
        phone: patient.phone || '',
        email: patient.email || '',
        dob: patient.dob || '',
        age: patient.age ?? '',
        gender: patient.gender || '',
        bloodGroup: patient.blood_group || '',
        address: patient.address || '',
        city: patient.city || '',
        pincode: patient.pincode || '',
        notes: patient.notes || '',
      }
      : empty,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return setError('Give the patient a name.');
    setSaving(true);
    setError('');
    try {
      if (patient) await patientService.update(patient.id, form);
      else await patientService.create(labId, form);
      await onSaved?.();
    } catch (err) {
      setError(err?.message || 'Could not save that patient.');
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={patient ? `Edit — ${patient.full_name}` : 'Register a patient'}
      maxWidth="max-w-xl"
    >
      <form className="space-y-4" onSubmit={submit}>
        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="p-name">Full name *</label>
            <input id="p-name" className="input-field" value={form.fullName} onChange={set('fullName')} required />
          </div>
          <div>
            <label className="form-label" htmlFor="p-phone">Phone</label>
            <input id="p-phone" className="input-field" value={form.phone} onChange={set('phone')} />
            <p className="mt-1 text-xs text-gray-500">
              How this patient is matched on their next visit.
            </p>
          </div>
          <div>
            <label className="form-label" htmlFor="p-email">Email</label>
            <input id="p-email" type="email" className="input-field" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="form-label" htmlFor="p-dob">Date of birth</label>
            <input id="p-dob" type="date" className="input-field" value={form.dob} onChange={set('dob')} />
            <p className="mt-1 text-xs text-gray-500">
              Preferred over age — reference ranges depend on it.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label" htmlFor="p-age">Age</label>
              <input id="p-age" type="number" min="0" max="120" className="input-field" value={form.age} onChange={set('age')} />
            </div>
            <div>
              <label className="form-label" htmlFor="p-gender">Gender</label>
              <select id="p-gender" className="input-field" value={form.gender} onChange={set('gender')}>
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="p-blood">Blood group</label>
            <select id="p-blood" className="input-field" value={form.bloodGroup} onChange={set('bloodGroup')}>
              <option value="">—</option>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="p-city">City</label>
            <input id="p-city" className="input-field" value={form.city} onChange={set('city')} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="p-address">Address</label>
            <input id="p-address" className="input-field" value={form.address} onChange={set('address')} />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor="p-notes">Notes</label>
            <textarea
              id="p-notes"
              rows={2}
              className="input-field"
              placeholder="Allergies, standing instructions, referring doctor…"
              value={form.notes}
              onChange={set('notes')}
            />
          </div>
        </div>

        <div className="flex gap-2 border-t border-gray-100 pt-4">
          <button type="button" className="btn-outline flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : patient ? 'Save changes' : 'Register patient'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
