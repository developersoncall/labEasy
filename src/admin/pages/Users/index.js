import React, { useState, useEffect, useMemo } from 'react';
import { usersData } from '../../adminData';
import { Avatar, Toast, Modal, ConfirmModal, Field, Badge, EmptyState, SectionTitle } from '../../components/Shared';
import './Users.css';

const PER_PAGE = 6;

/* ════════════════════════════════════════
   VIEW MODAL
════════════════════════════════════════ */
const ViewModal = ({ user, onClose, onEdit }) => {
  const [tab, setTab] = useState('profile');
  const [familyModal, setFamilyModal] = useState(null); // null | 'add' | member obj
  const [deleteFamily, setDeleteFamily] = useState(null);
  const [familyForm, setFamilyForm] = useState({ name: '', relation: 'Spouse', dob: '', blood: 'O+', gender: 'Male' });
  const [family, setFamily] = useState(user.family || []);
  const [toast, setToast] = useState(null);

  const RELATIONS = ['Spouse', 'Husband', 'Wife', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Other'];
  const BLOODS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  const openAddFamily = () => { setFamilyForm({ name:'', relation:'Spouse', dob:'', blood:'O+', gender:'Male' }); setFamilyModal('add'); };
  const openEditFamily = m => { setFamilyForm({ ...m }); setFamilyModal(m); };

  const saveFamily = async () => {
    if (!familyForm.name.trim()) return;
    if (familyModal === 'add') {
      setFamily(prev => [...prev, { ...familyForm, id: 'FM' + Date.now() }]);
      setToast({ msg: `${familyForm.name} added to family`, type: 'success' });
    } else {
      setFamily(prev => prev.map(m => m.id === familyModal.id ? { ...familyForm } : m));
      setToast({ msg: `${familyForm.name} updated`, type: 'success' });
    }
    setFamilyModal(null);
  };

  const confirmDeleteFamily = () => {
    setFamily(prev => prev.filter(m => m.id !== deleteFamily.id));
    setDeleteFamily(null);
    setToast({ msg: 'Family member removed', type: 'error' });
  };

  return (
    <>
      <Modal size="lg" onClose={onClose}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-user-hero">
            <Avatar name={user.name} size={52} />
            <div>
              <div className="modal-user-name">{user.name}</div>
              <div className="modal-user-meta">
                {user.ref} · Joined {user.joined} · <span className={`badge badge-${user.role === 'admin' ? 'red' : 'blue'}`} style={{ fontSize: 10, padding: '1px 6px' }}>{user.role}</span>
              </div>
            </div>
            <Badge status={user.status} />
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {[['profile','👤 Profile'],['notes','📝 Notes']].map(([k,l])=>(
            <button key={k} className={`modal-tab${tab===k?' active':''}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {/* Body */}
        <div className="modal-body">
          {tab === 'profile' && (
            <div className="view-grid">
              {[
                ['📞','Phone',user.phone],['✉️','Email',user.email],
                ['📍','City',user.city],['🏠','Address',user.address],
                ['🎂','DOB',user.dob],['⚧','Gender',user.gender],
                ['🩸','Blood Group',user.blood],['🔬','Tests Booked',user.tests],
              ].map(([icon,label,value])=>(
                <div key={label} className="info-row">
                  <div className="info-icon">{icon}</div>
                  <div className="info-label">{label}</div>
                  <div className="info-value">{value}</div>
                </div>
              ))}
            </div>
          )}

          {tab === 'family' && (
            <div>
              <div className="family-header">
                <span className="family-count">{family.length} member{family.length !== 1 ? 's' : ''}</span>
                <button className="btn btn-primary btn-sm" onClick={openAddFamily}>+ Add Member</button>
              </div>
              {family.length === 0
                ? <EmptyState icon="👨‍👩‍👧" message="No family members added yet" action={{ label: '+ Add First Member', fn: openAddFamily }} />
                : (
                  <div className="family-list">
                    {family.map(m => (
                      <div className="family-card" key={m.id}>
                        <Avatar name={m.name} size={42} bg="#7c3aed" />
                        <div className="family-card-info">
                          <div className="fc-name">{m.name}</div>
                          <div className="fc-meta">{m.relation} · {m.gender} · DOB: {m.dob} · Blood: {m.blood}</div>
                        </div>
                        <div className="family-actions">
                          <button className="btn btn-secondary btn-sm btn-icon" title="Edit" onClick={() => openEditFamily(m)}>✏️</button>
                          <button className="btn btn-secondary btn-sm btn-icon del-btn" title="Remove" onClick={() => setDeleteFamily(m)}>🗑</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {tab === 'notes' && (
            <div className="notes-view">
              {user.notes
                ? <p>{user.notes}</p>
                : <EmptyState icon="📝" message="No admin notes for this user" />}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => { onClose(); onEdit(user); }}>✏️ Edit User</button>
        </div>
      </Modal>

      {/* Family Add/Edit Modal */}
      {familyModal !== null && (
        <Modal size="sm" onClose={() => setFamilyModal(null)}>
          <div className="modal-header">
            <div className="modal-user-name">{familyModal === 'add' ? '+ Add Family Member' : `Edit — ${familyModal.name}`}</div>
            <button className="modal-close" onClick={() => setFamilyModal(null)}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-grid form-grid-2">
              <Field label="Full Name *">
                <input className="form-input" value={familyForm.name} onChange={e => setFamilyForm(p => ({ ...p, name: e.target.value }))} placeholder="Member name" />
              </Field>
              <Field label="Relation">
                <select className="form-select" value={familyForm.relation} onChange={e => setFamilyForm(p => ({ ...p, relation: e.target.value }))}>
                  {RELATIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Gender">
                <select className="form-select" value={familyForm.gender} onChange={e => setFamilyForm(p => ({ ...p, gender: e.target.value }))}>
                  {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Blood Group">
                <select className="form-select" value={familyForm.blood} onChange={e => setFamilyForm(p => ({ ...p, blood: e.target.value }))}>
                  {BLOODS.map(b => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Date of Birth">
                <input className="form-input" type="date" value={familyForm.dob} onChange={e => setFamilyForm(p => ({ ...p, dob: e.target.value }))} />
              </Field>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setFamilyModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveFamily} disabled={!familyForm.name.trim()}>
              {familyModal === 'add' ? '+ Add Member' : '✅ Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Family Confirm */}
      {deleteFamily && (
        <ConfirmModal
          title="Remove Family Member?"
          message={`Remove ${deleteFamily.name} (${deleteFamily.relation}) from ${user.name}'s profile? This cannot be undone.`}
          confirmLabel="🗑 Remove"
          danger
          onConfirm={confirmDeleteFamily}
          onClose={() => setDeleteFamily(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
};

/* ════════════════════════════════════════
   EDIT / ADD MODAL
════════════════════════════════════════ */
/* ── hoisted outside parent to prevent input remounting ── */
const FormField = ({ label, field, type = 'text', options, form, errors, onChange }) => (
  <Field label={label} error={errors[field]}>
    {options
      ? <select className={`form-select${errors[field] ? ' input-error' : ''}`} value={form[field] || ''} onChange={e => onChange(field, e.target.value)}>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      : <input className={`form-input${errors[field] ? ' input-error' : ''}`} type={type} value={form[field] || ''} onChange={e => onChange(field, e.target.value)} placeholder={label} />
    }
  </Field>
);

const UserFormModal = ({ user, isMainAdmin, onClose, onSave }) => {
  const isEdit = !!user;
  const [form, setForm] = useState(user ? { ...user } : {
    name:'', phone:'', email:'', city:'', gender:'Female', blood:'O+', dob:'', address:'', status:'active', role:'patient', notes:'',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!/^\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    onSave(isEdit ? form : { ...form, id: 'U' + Date.now().toString().slice(-4), tests: 0, joined: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), family: [] });
  };



  return (
    <Modal size="lg" onClose={onClose}>
      <div className="modal-header">
        <div className="modal-user-hero">
          <Avatar name={form.name || '?'} size={48} />
          <div>
            <div className="modal-user-name">{isEdit ? `Edit — ${user.name}` : 'Add New Patient'}</div>
            <div className="modal-user-meta">{isEdit ? user.ref : 'Fill in patient details below'}</div>
          </div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <SectionTitle>Personal Information</SectionTitle>
        <div className="form-grid form-grid-2">
          <FormField label="Full Name *" field="name"  form={form} errors={errors} onChange={set} />
          <FormField label="Phone *" field="phone"  form={form} errors={errors} onChange={set} />
          <FormField label="Email *" field="email" type="email"  form={form} errors={errors} onChange={set} />
          <FormField label="City" field="city"  form={form} errors={errors} onChange={set} />
          <FormField label="Date of Birth" field="dob" type="date"  form={form} errors={errors} onChange={set} />
          <FormField label="Gender" field="gender" options={['Male','Female','Other']}  form={form} errors={errors} onChange={set} />
          <FormField label="Blood Group" field="blood" options={['A+','A-','B+','B-','O+','O-','AB+','AB-']}  form={form} errors={errors} onChange={set} />
          <FormField label="Address" field="address"  form={form} errors={errors} onChange={set} />
        </div>
        <SectionTitle style={{ marginTop: 20 }}>Account Settings</SectionTitle>
        <div className="form-grid form-grid-2">
          <FormField label="Status" field="status" options={['active','blocked']}  form={form} errors={errors} onChange={set} />
          {isMainAdmin ? (
            <FormField label="Role" field="role" options={['patient','admin']}  form={form} errors={errors} onChange={set} />
          ) : (
            <Field label="Role">
              <input className="form-input" value={form.role || 'patient'} disabled />
            </Field>
          )}
        </div>
        <SectionTitle style={{ marginTop: 20 }}>Admin Notes</SectionTitle>
        <Field>
          <textarea className="form-textarea" rows={3} placeholder="Internal notes…" value={form.notes || ''} onChange={e => set('notes', e.target.value)} />
        </Field>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '⏳ Saving…' : isEdit ? '✅ Save Changes' : '+ Add Patient'}
        </button>
      </div>
    </Modal>
  );
};

/* ════════════════════════════════════════
   DELETE MODAL
════════════════════════════════════════ */
const DeleteModal = ({ user, onClose, onConfirm }) => {
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onConfirm(user.id);
  };
  return (
    <Modal size="sm" onClose={onClose}>
      <div className="modal-header delete-header">
        <div className="delete-icon-wrap">🗑️</div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body" style={{ textAlign: 'center' }}>
        <h3 className="delete-title">Delete Patient?</h3>
        <p className="delete-sub">Permanently delete <strong>{user.name}</strong> and all their data, bookings and reports. This cannot be undone.</p>
        <div className="delete-user-card">
          <Avatar name={user.name} size={36} />
          <div>
            <div style={{ fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{user.phone} · {user.tests} bookings</div>
          </div>
        </div>
        <Field label={<span>Type <strong>{user.name}</strong> to confirm</span>}>
          <input className="form-input" placeholder={user.name} value={typed} onChange={e => setTyped(e.target.value)} />
        </Field>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn btn-danger" onClick={handle} disabled={typed !== user.name || loading}>
          {loading ? '⏳ Deleting…' : '🗑️ Delete Permanently'}
        </button>
      </div>
    </Modal>
  );
};

/* ════════════════════════════════════════
   BLOCK MODAL
════════════════════════════════════════ */
const BlockModal = ({ user, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const isBlocking = user.status === 'active';
  const handle = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    onConfirm(user.id, isBlocking ? 'blocked' : 'active');
  };
  return (
    <Modal size="sm" onClose={onClose}>
      <div className="modal-header">
        <div className="modal-user-hero">
          <Avatar name={user.name} size={44} />
          <div>
            <div className="modal-user-name">{isBlocking ? '🚫 Block User' : '✅ Unblock User'}</div>
            <div className="modal-user-meta">{user.name}</div>
          </div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <div className={`alert alert-${isBlocking ? 'red' : 'blue'}`}>
          {isBlocking
            ? '⚠️ Blocking prevents this user from logging in or making bookings.'
            : '✅ Unblocking will restore full app access.'}
        </div>
        {isBlocking && (
          <Field label="Reason (optional)" style={{ marginTop: 14 }}>
            <textarea className="form-textarea" rows={3} placeholder="e.g. Duplicate account, suspicious activity…" value={reason} onChange={e => setReason(e.target.value)} />
          </Field>
        )}
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <button className={`btn ${isBlocking ? 'btn-danger' : 'btn-primary'}`} onClick={handle} disabled={loading}>
          {loading ? '⏳ Processing…' : isBlocking ? '🚫 Block User' : '✅ Unblock User'}
        </button>
      </div>
    </Modal>
  );
};

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
const Users = ({ adminEmail }) => {
  const isMainAdmin = adminEmail?.toLowerCase() === 'medis.com.bd@gmail.com';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [cityF, setCityF] = useState('All Cities');
  const [sortBy, setSortBy] = useState('joined');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [view, setView] = useState(null);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [block, setBlock] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toast_ = (msg, type = 'success') => setToast({ msg, type });

  // Load live users from Supabase
  useEffect(() => {
    usersData.load()
      .then(setUsers)
      .catch(e => toast_(e.message || 'Failed to load users', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const CITIES = useMemo(
    () => ['All Cities', ...Array.from(new Set(users.map(u => u.city).filter(Boolean)))],
    [users]
  );

  const filtered = users.filter(u => {
    if (statusF !== 'all' && u.status !== statusF) return false;
    if (cityF !== 'All Cities' && u.city !== cityF) return false;
    if (search && ![u.name, u.phone, u.email, u.ref].some(f => f?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => {
    let va = a[sortBy]; let vb = b[sortBy];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = col => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  };


  const handleSave = async updated => {
    try {
      const saved = await usersData.save(updated);
      setUsers(prev => prev.map(u => u.id === saved.id ? { ...u, ...saved } : u));
      toast_(`${saved.name} updated`);
      setEdit(null); setAddOpen(false);
    } catch (e) {
      toast_(e.message || 'Save failed', 'error');
    }
  };
  const handleDelete = async id => {
    const name = users.find(u => u.id === id)?.name;
    try {
      await usersData.remove(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      setDel(null);
      toast_(`${name} deleted`, 'error');
    } catch (e) {
      toast_(e.message || 'Delete failed', 'error');
    }
  };
  const handleBlock = async (id, newStatus) => {
    const name = users.find(u => u.id === id)?.name;
    try {
      await usersData.setStatus(id, newStatus);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
      setBlock(null);
      toast_(`${name} ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}`, newStatus === 'blocked' ? 'error' : 'success');
    } catch (e) {
      toast_(e.message || 'Update failed', 'error');
    }
  };
  const handleExport = () => {
    const csv = ['ID,Name,Phone,Email,City,Tests,Status,Joined',
      ...filtered.map(u => [u.ref, u.name, u.phone, u.email, u.city, u.tests, u.status, u.joined].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'labeasy-users.csv';
    a.click();
    toast_('Exported CSV');
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    blocked: users.filter(u => u.status === 'blocked').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="ph-title">Manage Users</div>
          <div className="ph-sub">{filtered.length} shown · {stats.total} total</div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-secondary" onClick={handleExport}>⬇ Export CSV</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-row">
        {[
          { i: '👥', c: '#1a6fc4', l: 'Total Users', n: stats.total },
          { i: '✅', c: '#0d9488', l: 'Active Accounts', n: stats.active },
          { i: '🚫', c: '#dc2626', l: 'Blocked Accounts', n: stats.blocked },
          { i: '🛡️', c: '#7c3aed', l: 'Administrators', n: stats.admins },
        ].map((s, i) => (
          <div className="stat-card" key={i}>
            <div className="sc-top"><div className="sc-icon" style={{ background: s.c + '20' }}>{s.i}</div></div>
            <div className="sc-num">{s.n}</div>
            <div className="sc-label">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-row">
        <div className="search-input">
          <span>🔍</span>
          <input placeholder="Search name, phone or email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
        </div>
        <select className="filter-select" value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
          <option value="all">All Status</option>
          <option value="active">✅ Active</option>
          <option value="blocked">🚫 Blocked</option>
        </select>
        <select className="filter-select" value={cityF} onChange={e => { setCityF(e.target.value); setPage(1); }}>
          {CITIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={`${sortBy}-${sortDir}`} onChange={e => { const [col, dir] = e.target.value.split('-'); setSortBy(col); setSortDir(dir); }}>
          <option value="name-asc">Name A→Z</option>
          <option value="name-desc">Name Z→A</option>
          <option value="tests-desc">Most Bookings</option>
          <option value="tests-asc">Least Bookings</option>
          <option value="joined-desc">Newest First</option>
          <option value="joined-asc">Oldest First</option>
        </select>
        {(search || statusF !== 'all' || cityF !== 'All Cities') && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setStatusF('all'); setCityF('All Cities'); setPage(1); }}>✕ Clear</button>
        )}
      </div>

      {/* Table */}
      {paged.length === 0
        ? <EmptyState icon="🔍" message="No users match your filters" action={{ label: 'Clear filters', fn: () => { setSearch(''); setStatusF('all'); setCityF('All Cities'); } }} />
        : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort('name')}>User <span className="sort-ico">{sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th className="sortable" onClick={() => toggleSort('city')}>City <span className="sort-ico">{sortBy === 'city' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                  <th className="sortable" onClick={() => toggleSort('tests')}>Bookings <span className="sort-ico">{sortBy === 'tests' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                  <th>Status</th>
                  <th className="sortable" onClick={() => toggleSort('joined')}>Joined <span className="sort-ico">{sortBy === 'joined' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <Avatar name={u.name} size={34} />
                        <div>
                          <div className="user-name">{u.name}</div>
                          <div className="user-id" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {u.ref}
                            <span className={`badge badge-${u.role === 'admin' ? 'red' : 'blue'}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                              {u.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{u.phone}</td>
                    <td className="email-cell">{u.email}</td>
                    <td>{u.city}</td>
                    <td><span className="tests-num">{u.tests}</span>{u.tests > 10 && <span> 🔥</span>}</td>
                    <td><Badge status={u.status} /></td>
                    <td className="date-cell">{u.joined}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary btn-sm btn-icon" title="View" onClick={() => setView(u)}>👁</button>
                        {(isMainAdmin || u.role !== 'admin') && (
                          <>
                            <button className="btn btn-secondary btn-sm btn-icon" title="Edit" onClick={() => setEdit(u)}>✏️</button>
                            <button className={`btn btn-sm ${u.status === 'active' ? 'btn-block' : 'btn-primary'}`} title={u.status === 'active' ? 'Block' : 'Unblock'} onClick={() => setBlock(u)}>
                              {u.status === 'active' ? '🚫' : '✅'}
                            </button>
                            <button className="btn btn-secondary btn-sm btn-icon del-btn" title="Delete" onClick={() => setDel(u)}>🗑</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <span className="page-info">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
          <div className="page-btns">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} className={`page-btn${page === i + 1 ? ' page-active' : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {view && <ViewModal user={view} onClose={() => setView(null)} onEdit={u => { setView(null); setEdit(u); }} />}
      {edit && <UserFormModal user={edit} isMainAdmin={isMainAdmin} onClose={() => setEdit(null)} onSave={handleSave} />}
      {del && <DeleteModal user={del} onClose={() => setDel(null)} onConfirm={handleDelete} />}
      {block && <BlockModal user={block} onClose={() => setBlock(null)} onConfirm={handleBlock} />}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
};

export default Users;
