import { useCallback, useEffect, useState } from 'react';
import { FaUserPlus, FaUserSlash, FaUserCheck } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Modal from '../../components/common/Modal.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { labStaffService, STAFF_ROLES, ROLE_LABELS } from '../../services/labStaffService.js';
import { Page, PageHeader, Section, TableFrame, Td, Row, Alert } from '../components/ui.jsx';

/**
 * Staff management — Lab Admin only.
 *
 * Creating a staff member writes an invite row (which carries the role and the
 * lab) and then signs the account up on a session-less client, so the Lab
 * Admin is never logged out mid-task. The role is applied by the database
 * trigger from that invite, never sent as a claim from this page, and the
 * invites table is closed to every role except lab_admin.
 */
export default function LabStaff() {
  const { labId, profile } = useAuth();
  useDocumentTitle('Staff');

  const [staff, setStaff] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    try {
      const [people, pending] = await Promise.all([
        labStaffService.list(labId),
        labStaffService.pendingInvites(labId),
      ]);
      setStaff(people);
      setInvites(pending);
    } catch (err) {
      setError(err?.message || 'Could not load staff.');
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      await fn();
      if (message) setNotice(message);
      await load();
    } catch (err) {
      setError(err?.message || 'That action was refused.');
    }
  };

  if (loading) return <Spinner full />;

  return (
    <Page>
      <PageHeader title="Staff" subtitle="Who works at this lab, and what each of them is allowed to do.">
        <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
          <FaUserPlus aria-hidden="true" /> Create staff
        </button>
      </PageHeader>

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
      {notice && <Alert tone="success" onDismiss={() => setNotice('')}>{notice}</Alert>}

      <TableFrame head={['Name', 'Email', 'Role', 'Status', { label: '', align: 'right' }]}
        empty={!staff.length}
        emptyIcon="👥"
        emptyText="No staff yet — create your first account above.">
        {staff.map((s) => {
          const isSelf = s.id === profile?.id;
          return (
            <Row key={s.id}>
              <Td>
                <p className="font-semibold text-gray-900">{s.full_name || '—'}</p>
                {isSelf && <p className="text-xs text-primary-600">That&apos;s you</p>}
              </Td>
              <Td className="text-gray-600">{s.email}</Td>
              <Td>
                <select
                  className="input-field h-9 w-40 py-1 text-sm"
                  value={s.role}
                  disabled={isSelf}
                  onChange={(e) => act(() => labStaffService.setRole(s.id, e.target.value), 'Role updated.')}
                  aria-label={`Role for ${s.full_name || s.email}`}
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </Td>
              <Td>
                <span className={`badge ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {s.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </Td>
              <Td className="text-right">
                {!isSelf && (
                  <button
                    type="button"
                    className="btn-soft px-3 py-1.5 text-xs"
                    onClick={() =>
                      act(
                        () => labStaffService.setStatus(s.id, s.status === 'active' ? 'inactive' : 'active'),
                        s.status === 'active' ? 'Staff member deactivated.' : 'Staff member reactivated.',
                      )
                    }
                  >
                    {s.status === 'active' ? (
                      <><FaUserSlash aria-hidden="true" /> Deactivate</>
                    ) : (
                      <><FaUserCheck aria-hidden="true" /> Activate</>
                    )}
                  </button>
                )}
              </Td>
            </Row>
          );
        })}
      </TableFrame>

      {invites.length > 0 && (
        <Section
          title="Invites waiting to be completed"
          description="These accounts were created but have not confirmed their email yet."
        >
          <TableFrame head={['Email', 'Role', 'Created', { label: '', align: 'right' }]}>
            {invites.map((i) => (
              <Row key={i.id}>
                <Td className="text-gray-700">{i.email}</Td>
                <Td>{ROLE_LABELS[i.role] || i.role}</Td>
                <Td className="text-gray-500">{new Date(i.created_at).toLocaleDateString()}</Td>
                <Td className="text-right">
                  <button
                    type="button"
                    className="btn-soft px-3 py-1.5 text-xs"
                    onClick={() => act(() => labStaffService.revokeInvite(i.id), 'Invite revoked.')}
                  >
                    Revoke
                  </button>
                </Td>
              </Row>
            ))}
          </TableFrame>
        </Section>
      )}

      <AddStaffModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={async (values) => {
          await act(async () => {
            const res = await labStaffService.createStaff(labId, { ...values, createdBy: profile?.user_id });
            setAddOpen(false);
            setNotice(
              res.needsVerification
                ? `Account created for ${values.email}. They must confirm the email before signing in.`
                : `${values.fullName || values.email} can sign in now with the password you set.`,
            );
          });
        }}
      />
    </Page>
  );
}

/* -------------------------------------------------------------------------- */

function AddStaffModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'receptionist', password: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreate(form);
      setForm({ fullName: '', email: '', phone: '', role: 'receptionist', password: '' });
    } finally {
      setSaving(false);
    }
  };

  const roleHint = STAFF_ROLES.find((r) => r.value === form.role)?.hint;

  return (
    <Modal open={open} onClose={onClose} title="Create staff account">
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="form-label" htmlFor="staff-name">Full name *</label>
          <input id="staff-name" className="input-field" value={form.fullName} onChange={set('fullName')} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor="staff-email">Email *</label>
            <input id="staff-email" type="email" className="input-field" value={form.email} onChange={set('email')} required />
          </div>
          <div>
            <label className="form-label" htmlFor="staff-phone">Phone</label>
            <input id="staff-phone" className="input-field" value={form.phone} onChange={set('phone')} />
          </div>
        </div>
        <div>
          <label className="form-label" htmlFor="staff-role">Role *</label>
          <select id="staff-role" className="input-field" value={form.role} onChange={set('role')}>
            {STAFF_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {roleHint && <p className="mt-1 text-xs text-gray-500">{roleHint}</p>}
        </div>
        <div>
          <label className="form-label" htmlFor="staff-password">Temporary password *</label>
          <input
            id="staff-password"
            type="text"
            className="input-field font-mono"
            value={form.password}
            onChange={set('password')}
            minLength={8}
            required
            placeholder="At least 8 characters"
          />
          <p className="mt-1 text-xs text-gray-500">
            Share this with them — they can change it from the sign-in page later.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-outline flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
