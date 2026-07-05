import React, { useState, useEffect } from 'react';
import { doctorsData, exportCSV } from '../../adminData';
import { formatCurrency, currencySymbol } from '../../../utils/helpers.js';
import { Avatar, Toast, Modal, ConfirmModal, Field, Badge, EmptyState, SectionTitle } from '../../components/Shared';

const GENDERS = ['male', 'female', 'other'];

/* ── Add / Edit modal (hoisted field to avoid remount) ── */
const DField = ({ label, field, type = 'text', options, full, form, errors, onChange }) => (
  <Field label={label} error={errors[field]}>
    {options ? (
      <select className={`form-select${errors[field] ? ' input-error' : ''}`} value={form[field] || ''} onChange={e => onChange(field, e.target.value)}>
        <option value="">Select…</option>
        {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    ) : (
      <input className={`form-input${errors[field] ? ' input-error' : ''}`} type={type} value={form[field] ?? ''} onChange={e => onChange(field, e.target.value)} placeholder={label} style={full ? { gridColumn: '1/-1' } : {}} />
    )}
  </Field>
);

const DoctorFormModal = ({ doctor, specialties, onClose, onSave }) => {
  const isEdit = !!doctor;
  const [form, setForm] = useState(doctor || {
    name: '', specialtyId: '', qualifications: '', experience: '', consultationFee: '', videoFee: '',
    gender: 'male', city: '', clinic: '', languages: '', about: '', photo: '',
    verified: true, featured: false, active: true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Doctor name is required';
    if (!form.specialtyId) e.specialtyId = 'Select a specialty';
    if (!form.consultationFee || isNaN(form.consultationFee)) e.consultationFee = 'Valid fee required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal size="lg" onClose={onClose}>
      <div className="modal-header">
        <div className="modal-user-hero">
          <Avatar name={form.name || '?'} size={48} />
          <div>
            <div className="modal-user-name">{isEdit ? `Edit — ${doctor.name}` : 'Add New Doctor'}</div>
            <div className="modal-user-meta">{isEdit ? 'Update doctor profile' : 'Fill in the doctor details'}</div>
          </div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <SectionTitle>Profile</SectionTitle>
        <div className="form-grid form-grid-2">
          <DField label="Full Name *" field="name" form={form} errors={errors} onChange={set} />
          <DField label="Specialty *" field="specialtyId" options={specialties.map(s => ({ value: s.id, label: s.name }))} form={form} errors={errors} onChange={set} />
          <DField label="Qualifications" field="qualifications" form={form} errors={errors} onChange={set} />
          <DField label="Experience (years)" field="experience" type="number" form={form} errors={errors} onChange={set} />
          <DField label="Gender" field="gender" options={GENDERS} form={form} errors={errors} onChange={set} />
          <DField label="City" field="city" form={form} errors={errors} onChange={set} />
          <DField label="Clinic / Hospital" field="clinic" form={form} errors={errors} onChange={set} />
          <DField label="Languages (comma separated)" field="languages" form={form} errors={errors} onChange={set} />
        </div>

        <SectionTitle style={{ marginTop: 20 }}>Consultation Fees</SectionTitle>
        <div className="form-grid form-grid-2">
          <DField label={`In-Clinic Fee (${currencySymbol()}) *`} field="consultationFee" type="number" form={form} errors={errors} onChange={set} />
          <DField label={`Video Consult Fee (${currencySymbol()})`} field="videoFee" type="number" form={form} errors={errors} onChange={set} />
          <DField label="Photo URL (optional)" field="photo" full form={form} errors={errors} onChange={set} />
        </div>

        <SectionTitle style={{ marginTop: 20 }}>About</SectionTitle>
        <Field>
          <textarea className="form-textarea" rows={3} placeholder="Short bio / about the doctor…" value={form.about || ''} onChange={e => set('about', e.target.value)} />
        </Field>

        <SectionTitle style={{ marginTop: 20 }}>Visibility</SectionTitle>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[['active', 'Active / Listed'], ['featured', 'Featured on home'], ['verified', 'Verified badge']].map(([k, l]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="toggle"><input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} /><span className="toggle-slider" /></label>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? '⏳ Saving…' : isEdit ? '✅ Save Changes' : '+ Add Doctor'}</button>
      </div>
    </Modal>
  );
};

/* ── View modal ── */
const ViewDoctor = ({ doctor, onClose, onEdit }) => (
  <Modal size="md" onClose={onClose}>
    <div className="modal-header">
      <div className="modal-user-hero">
        <Avatar name={doctor.name} size={52} />
        <div>
          <div className="modal-user-name">{doctor.name}</div>
          <div className="modal-user-meta">{doctor.specialty} · {doctor.qualifications}</div>
        </div>
        <Badge status={doctor.active ? 'active' : 'inactive'} />
      </div>
      <button className="modal-close" onClick={onClose}>✕</button>
    </div>
    <div className="modal-body">
      <div className="view-grid">
        {[
          ['🩺', 'Specialty', doctor.specialty],
          ['🎓', 'Experience', `${doctor.experience} yrs`],
          ['💰', 'Clinic Fee', formatCurrency(doctor.consultationFee)],
          ['💻', 'Video Fee', formatCurrency(doctor.videoFee)],
          ['📍', 'City', doctor.city],
          ['🏥', 'Clinic', doctor.clinic],
          ['🗣️', 'Languages', doctor.languages],
          ['⭐', 'Rating', `${doctor.rating} (${doctor.reviewCount})`],
        ].map(([i, l, v]) => (
          <div key={l} className="info-row"><div className="info-icon">{i}</div><div className="info-label">{l}</div><div className="info-value">{v || '—'}</div></div>
        ))}
      </div>
      {doctor.about && <div className="notes-view" style={{ marginTop: 16 }}>{doctor.about}</div>}
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary" onClick={onClose}>Close</button>
      <button className="btn btn-primary" onClick={() => { onClose(); onEdit(doctor); }}>✏️ Edit Doctor</button>
    </div>
  </Modal>
);

/* ── Main page ── */
const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [search, setSearch] = useState('');
  const [specF, setSpecF] = useState('All');
  const [view, setView] = useState(null);
  const [edit, setEdit] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [del, setDel] = useState(null);
  const [toast, setToast] = useState(null);
  const toast_ = (msg, type = 'success') => setToast({ msg, type });

  const reload = () => doctorsData.load().then(setDoctors).catch(e => toast_(e.message || 'Failed to load doctors', 'error'));
  useEffect(() => {
    reload();
    doctorsData.specialties().then(setSpecialties).catch(() => {});
  }, []);

  const filtered = doctors.filter(d => {
    if (specF !== 'All' && d.specialty !== specF) return false;
    if (search && ![d.name, d.specialty, d.city].some(f => f?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const toggleActive = async d => {
    try { const saved = await doctorsData.setActive(d.id, !d.active); setDoctors(prev => prev.map(x => x.id === d.id ? saved : x)); toast_('Status updated'); }
    catch (e) { toast_(e.message || 'Update failed', 'error'); }
  };

  const handleSave = async d => {
    try {
      await doctorsData.save(d);
      await reload(); // reload so the specialty label + rating are correct
      toast_(d.id ? `${d.name} updated` : `${d.name} added`);
      setEdit(null); setAddOpen(false);
    } catch (e) { toast_(e.message || 'Save failed', 'error'); }
  };

  const handleDel = async id => {
    const name = doctors.find(d => d.id === id)?.name;
    try { await doctorsData.remove(id); setDoctors(prev => prev.filter(d => d.id !== id)); setDel(null); toast_(`${name} deleted`, 'error'); }
    catch (e) { toast_(e.message || 'Delete failed', 'error'); }
  };

  const handleExport = () => {
    const headers = ['Name', 'Specialty', 'Qualifications', 'Experience', 'Clinic Fee', 'Video Fee', 'City', 'Clinic', 'Active'];
    const rows = filtered.map(d => [d.name, d.specialty, d.qualifications, d.experience, d.consultationFee, d.videoFee, d.city, d.clinic, d.active ? 'Yes' : 'No']);
    exportCSV('labeasy-doctors.csv', headers, rows);
    toast_('Exported CSV');
  };

  return (
    <div>
      <div className="page-header">
        <div><div className="ph-title">Manage Doctors</div><div className="ph-sub">{doctors.length} doctors in the directory</div></div>
        <div className="ph-actions">
          <button className="btn btn-secondary" onClick={handleExport}>⬇ Export</button>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}>+ Add Doctor</button>
        </div>
      </div>

      <div className="stat-row">
        {[
          { i: '🩺', c: '#1a6fc4', l: 'Total Doctors', n: doctors.length },
          { i: '✅', c: '#0d9488', l: 'Active', n: doctors.filter(d => d.active).length },
          { i: '⭐', c: '#d97706', l: 'Featured', n: doctors.filter(d => d.featured).length },
          { i: '🗂️', c: '#7c3aed', l: 'Specialties', n: specialties.length },
        ].map((s, i) => (
          <div className="stat-card" key={i}><div className="sc-top"><div className="sc-icon" style={{ background: s.c + '20' }}>{s.i}</div></div><div className="sc-num">{s.n}</div><div className="sc-label">{s.l}</div></div>
        ))}
      </div>

      <div className="filter-row">
        <div className="search-input">
          <span>🔍</span>
          <input placeholder="Search doctors…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
        </div>
        <select className="filter-select" value={specF} onChange={e => setSpecF(e.target.value)}>
          <option>All</option>
          {specialties.map(s => <option key={s.id}>{s.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? <EmptyState icon="🩺" message="No doctors found" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Doctor</th><th>Specialty</th><th>Experience</th><th>Clinic Fee</th><th>City</th><th>Rating</th><th>Active</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td>
                    <div className="user-cell">
                      <Avatar name={d.name} size={34} />
                      <div><div className="user-name">{d.name}</div><div className="user-id">{d.qualifications}</div></div>
                    </div>
                  </td>
                  <td><span className="cat-badge">{d.specialty || '—'}</span></td>
                  <td className="date-cell">{d.experience} yrs</td>
                  <td><span className="price-val">{formatCurrency(d.consultationFee)}</span></td>
                  <td>{d.city}</td>
                  <td><span className="rating-val">⭐ {d.rating}</span></td>
                  <td>
                    <label className="toggle"><input type="checkbox" checked={d.active} onChange={() => toggleActive(d)} /><span className="toggle-slider" /></label>
                  </td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-secondary btn-sm btn-icon" title="View" onClick={() => setView(d)}>👁</button>
                      <button className="btn btn-secondary btn-sm btn-icon" title="Edit" onClick={() => setEdit(d)}>✏️</button>
                      <button className="btn btn-secondary btn-sm btn-icon del-btn" title="Delete" onClick={() => setDel(d)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view && <ViewDoctor doctor={view} onClose={() => setView(null)} onEdit={d => { setView(null); setEdit(d); }} />}
      {edit && <DoctorFormModal doctor={edit} specialties={specialties} onClose={() => setEdit(null)} onSave={handleSave} />}
      {addOpen && <DoctorFormModal specialties={specialties} onClose={() => setAddOpen(false)} onSave={handleSave} />}
      {del && <ConfirmModal title="Delete Doctor?" message={`Delete "${del.name}"? This removes them from the website directory.`} confirmLabel="🗑 Delete" danger onConfirm={() => handleDel(del.id)} onClose={() => setDel(null)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
};

export default Doctors;
