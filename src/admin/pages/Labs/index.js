import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { labDocumentService } from '../../../services/labDocumentService.js';
import { labService } from '../../../services/labService.js';
import { labBookingService } from '../../../services/labBookingService.js';
import { Toast, Modal, ConfirmModal, EmptyState } from '../../components/Shared';
import './Labs.css';

/**
 * LABS — the registration queue and the register of every laboratory.
 *
 * Approve, reject, suspend, reactivate. Status changes are the one thing only
 * a platform admin can do: `protect_lab_status` in the database reverts a
 * status write from anybody else, so this screen is the single door.
 */

const TABS = [
  { key: 'pending', label: 'Pending', tone: 'yellow' },
  { key: 'approved', label: 'Approved', tone: 'green' },
  { key: 'rejected', label: 'Rejected', tone: 'red' },
  { key: 'suspended', label: 'Suspended', tone: 'purple' },
  { key: 'all', label: 'All labs', tone: 'gray' },
];

const STATUS_TONE = { pending: 'yellow', approved: 'green', rejected: 'red', suspended: 'purple', inactive: 'gray' };

/**
 * The full picture of one laboratory, and the paperwork behind it.
 *
 * This is the screen an approval decision is actually made on, so it leads
 * with identity and documents rather than burying them in a field grid: who
 * they are, what they sent, how much they are running, then the decision
 * buttons in the footer.
 */
const LabDetails = ({ lab, stats, onClose, onApprove, onReject, onSuspend, onActivate }) => {
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsMissing, setDocsMissing] = useState(false);
  const [docError, setDocError] = useState('');

  useEffect(() => {
    let alive = true;
    setDocsLoading(true);
    labDocumentService
      .listForLab(lab.id)
      .then(({ documents, schemaMissing }) => {
        if (!alive) return;
        setDocs(documents);
        setDocsMissing(schemaMissing);
      })
      .catch((e) => alive && setDocError(e?.message || 'Could not load documents.'))
      .finally(() => alive && setDocsLoading(false));
    return () => { alive = false; };
  }, [lab.id]);

  const openDoc = async (d) => {
    try {
      const url = await labDocumentService.viewUrl(d.file_path);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (e) {
      setDocError(e?.message || 'Could not open that document.');
    }
  };

  const initials = (lab.name || '?').trim().charAt(0).toUpperCase();
  const registered = new Date(lab.created_at).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <Modal size="lg" onClose={onClose}>
      <div className="modal-header labv-header">
        <div className="labv-id">
          <div className="labv-avatar">{initials}</div>
          <div>
            <div className="modal-user-name">{lab.name}</div>
            <div className="modal-user-meta">
              <span className="labv-ref">{lab.lab_ref}</span> · registered {registered}
              {lab.city ? ` · ${lab.city}` : ''}
            </div>
          </div>
        </div>
        <div className="labv-header-right">
          <span className={`badge badge-${STATUS_TONE[lab.status] || 'gray'}`}>{lab.status}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="modal-body">
        {lab.status === 'rejected' && lab.rejection_reason && (
          <div className="alert alert-red">Rejected: {lab.rejection_reason}</div>
        )}
        {lab.status === 'pending' && (
          <div className="alert alert-yellow">
            ⏳ Awaiting your decision. Check the licence number against the documents below before approving.
          </div>
        )}

        {/* ---- activity ---- */}
        <div className="labv-stats">
          {[
            ['Bookings', stats ? stats.total ?? 0 : '—'],
            ['Completed', stats ? stats.completed ?? 0 : '—'],
            ['In testing', stats ? (stats.sent_for_testing || 0) + (stats.testing_in_progress || 0) : '—'],
            ['Documents', docsLoading ? '…' : docs.length],
          ].map(([label, value]) => (
            <div className="labv-stat" key={label}>
              <div className="labv-stat-num">{value}</div>
              <div className="labv-stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* ---- documents: the reason this screen exists ---- */}
        <div className="labv-section">
          <div className="labv-section-title">📎 Verification documents</div>
          {docError && <div className="alert alert-red">{docError}</div>}
          {docsMissing ? (
            <div className="alert alert-yellow">
              Document storage needs section 19 of <code>newSQL.html</code> to be run.
            </div>
          ) : docsLoading ? (
            <div className="labv-empty">Loading documents…</div>
          ) : !docs.length ? (
            <div className="labv-empty">
              This laboratory has not uploaded any documents. Consider asking for its licence before approving.
            </div>
          ) : (
            <ul className="labv-docs">
              {docs.map((d) => (
                <li key={d.id}>
                  <span className="labv-doc-icon">📄</span>
                  <div className="labv-doc-meta">
                    <div className="labv-doc-title">{d.title || d.doc_type}</div>
                    <div className="labv-doc-sub">
                      {d.file_name}
                      {d.file_size ? ` · ${Math.max(1, Math.round(d.file_size / 1024))} KB` : ''}
                      {` · ${new Date(d.created_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={() => openDoc(d)}>👁 Open PDF</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- the details ---- */}
        <div className="labv-section">
          <div className="labv-section-title">🏥 Laboratory</div>
          <div className="labv-grid">
            {[
              ['Contact person', lab.contact_person],
              ['Email', lab.email],
              ['Phone', lab.phone],
              ['Alternate phone', lab.alt_phone],
              ['Licence number', lab.license_no],
              ['Registration number', lab.registration_no],
              ['City', lab.city],
              ['Postcode', lab.pincode],
            ].map(([label, value]) => (
              <div className="labv-field" key={label}>
                <div className="labv-field-label">{label}</div>
                <div className="labv-field-value">{value || '—'}</div>
              </div>
            ))}
          </div>
          {lab.address && (
            <div className="labv-field labv-field-wide">
              <div className="labv-field-label">Address</div>
              <div className="labv-field-value">{lab.address}</div>
            </div>
          )}
          {lab.description && (
            <div className="labv-field labv-field-wide">
              <div className="labv-field-label">About</div>
              <div className="labv-field-value">{lab.description}</div>
            </div>
          )}
          {lab.approved_at && (
            <div className="labv-field labv-field-wide">
              <div className="labv-field-label">Approved</div>
              <div className="labv-field-value">{new Date(lab.approved_at).toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
        {lab.status === 'pending' && (
          <>
            <button className="btn btn-danger" onClick={() => onReject?.(lab)}>✕ Reject</button>
            <button className="btn btn-primary" onClick={() => onApprove?.(lab)}>✓ Approve laboratory</button>
          </>
        )}
        {lab.status === 'approved' && (
          <button className="btn btn-danger" onClick={() => onSuspend?.(lab)}>⏸ Suspend</button>
        )}
        {['suspended', 'rejected', 'inactive'].includes(lab.status) && (
          <button className="btn btn-primary" onClick={() => onActivate?.(lab)}>✓ Activate</button>
        )}
      </div>
    </Modal>
  );
};

const RejectModal = ({ lab, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  return (
    <ConfirmModal
      title={`Reject ${lab.name}?`}
      message="The laboratory will see this reason when they sign in. They keep their account and can be approved later."
      confirmLabel="Reject registration"
      danger
      onClose={onClose}
      onConfirm={() => onConfirm(reason)}
    >
      <textarea
        className="form-textarea"
        rows={3}
        placeholder="Why is this registration being rejected?"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </ConfirmModal>
  );
};

const Labs = ({ adminId, onChange }) => {
  const [tab, setTab] = useState('pending');
  const [labs, setLabs] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewingStats, setViewingStats] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, c] = await Promise.all([labService.list({ status: tab }), labService.counts()]);
      setLabs(rows);
      setCounts(c);
    } catch (err) {
      setToast({ msg: err?.message || 'Could not load laboratories.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return labs;
    return labs.filter(
      (l) =>
        l.name.toLowerCase().includes(s) ||
        (l.email || '').toLowerCase().includes(s) ||
        (l.city || '').toLowerCase().includes(s) ||
        (l.lab_ref || '').toLowerCase().includes(s),
    );
  }, [labs, search]);

  const setStatus = async (lab, status, reason) => {
    try {
      await labService.setStatus(lab.id, status, { reason, approvedBy: adminId });
      setToast({ msg: `${lab.name} — ${status}.`, type: 'success' });
      await load();
      onChange?.();
    } catch (err) {
      setToast({ msg: err?.message || 'That change was refused.', type: 'error' });
    }
  };

  const openDetails = async (lab) => {
    setViewing(lab);
    setViewingStats(null);
    try {
      setViewingStats(await labBookingService.stageCounts(lab.id));
    } catch {
      setViewingStats(null);
    }
  };

  return (
    <>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <div className="page-header">
        <div>
          <h1 className="ph-title">Laboratories</h1>
          <p className="ph-sub">Registrations, approvals and the status of every lab on the platform.</p>
        </div>
        <div className="ph-actions">
          <input
            className="search-input"
            placeholder="Search name, email, city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div className="stat-row labs-stats">
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{ background: '#0ea5e920' }}>🏥</div></div><div className="sc-num">{counts.total || 0}</div><div className="sc-label">Registered labs</div></div>
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{ background: '#d9770620' }}>⏳</div></div><div className="sc-num">{counts.pending || 0}</div><div className="sc-label">Awaiting approval</div></div>
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{ background: '#05966920' }}>✅</div></div><div className="sc-num">{counts.approved || 0}</div><div className="sc-label">Approved</div></div>
        <div className="stat-card"><div className="sc-top"><div className="sc-icon" style={{ background: '#7c3aed20' }}>⏸️</div></div><div className="sc-num">{counts.suspended || 0}</div><div className="sc-label">Suspended</div></div>
      </div>

      <div className="labs-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`labs-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key !== 'all' && counts[t.key] > 0 && <span className="labs-tab-count">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card"><div className="card-body">Loading laboratories…</div></div>
      ) : !visible.length ? (
        <EmptyState icon="🏥" message={tab === 'pending' ? 'No registrations waiting for review.' : 'No laboratories in this view.'} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Laboratory</th>
                <th>Contact</th>
                <th>City</th>
                <th>Registered</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((lab) => (
                <tr key={lab.id}>
                  <td><span className="labs-ref">{lab.lab_ref}</span></td>
                  <td>
                    <div className="labs-name">{lab.name}</div>
                    <div className="labs-meta">{lab.license_no ? `Licence ${lab.license_no}` : 'No licence recorded'}</div>
                  </td>
                  <td>
                    <div>{lab.contact_person || '—'}</div>
                    <div className="labs-meta">{lab.email}</div>
                  </td>
                  <td>{lab.city || '—'}</td>
                  <td>{new Date(lab.created_at).toLocaleDateString()}</td>
                  <td><span className={`badge badge-${STATUS_TONE[lab.status] || 'gray'}`}>{lab.status}</span></td>
                  <td>
                    <div className="labs-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openDetails(lab)}>View</button>
                      {lab.status === 'pending' && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => setConfirming({ lab, status: 'approved' })}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setRejecting(lab)}>Reject</button>
                        </>
                      )}
                      {lab.status === 'approved' && (
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirming({ lab, status: 'suspended' })}>Suspend</button>
                      )}
                      {['suspended', 'rejected', 'inactive'].includes(lab.status) && (
                        <button className="btn btn-primary btn-sm" onClick={() => setConfirming({ lab, status: 'approved' })}>Activate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <LabDetails
          lab={viewing}
          stats={viewingStats}
          onClose={() => setViewing(null)}
          onApprove={(l) => { setViewing(null); setConfirming({ lab: l, status: 'approved' }); }}
          onReject={(l) => { setViewing(null); setRejecting(l); }}
          onSuspend={(l) => { setViewing(null); setConfirming({ lab: l, status: 'suspended' }); }}
          onActivate={(l) => { setViewing(null); setConfirming({ lab: l, status: 'approved' }); }}
        />
      )}

      {rejecting && (
        <RejectModal
          lab={rejecting}
          onClose={() => setRejecting(null)}
          onConfirm={async (reason) => {
            await setStatus(rejecting, 'rejected', reason);
            setRejecting(null);
          }}
        />
      )}

      {confirming && (
        <ConfirmModal
          title={confirming.status === 'approved' ? `Approve ${confirming.lab.name}?` : `Suspend ${confirming.lab.name}?`}
          message={
            confirming.status === 'approved'
              ? 'The laboratory gets immediate access to its dashboard and can start creating staff and bookings.'
              : 'Everyone at this laboratory loses access straight away. The data is kept and returns when you reactivate.'
          }
          confirmLabel={confirming.status === 'approved' ? 'Approve laboratory' : 'Suspend laboratory'}
          danger={confirming.status !== 'approved'}
          onClose={() => setConfirming(null)}
          onConfirm={async () => {
            await setStatus(confirming.lab, confirming.status);
            setConfirming(null);
          }}
        />
      )}
    </>
  );
};

export default Labs;
