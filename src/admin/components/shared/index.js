import React, { useEffect, useState } from 'react';
import './shared.css';

/* ─── AVATAR ─────────────────────────────────── */
export const Avatar = ({ name = '?', size = 34, bg = 'var(--accent)', color = 'white' }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', background: bg, color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: size * 0.38, flexShrink: 0,
    fontFamily: 'Lato, sans-serif',
  }}>{(name || '?')[0].toUpperCase()}</div>
);

/* ─── MODAL ──────────────────────────────────── */
export const Modal = ({ children, onClose, size = 'lg' }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handler = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`}>{children}</div>
    </div>
  );
};

export const ModalHeader = ({ title, subtitle, avatar, badge, onClose, badgeClass = '' }) => (
  <div className="modal-header">
    <div className="modal-user-hero">
      {avatar && <Avatar name={avatar} size={48} />}
      <div>
        <div className="modal-user-name">{title}</div>
        {subtitle && <div className="modal-user-meta">{subtitle}</div>}
      </div>
      {badge && <span className={`badge ${badgeClass} ms-auto`}>{badge}</span>}
    </div>
    <button className="modal-close" onClick={onClose}>✕</button>
  </div>
);

export const ModalFooter = ({ onClose, onSave, saveLabel = 'Save Changes', saving = false, saveDisabled = false, saveDanger = false }) => (
  <div className="modal-footer">
    <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
    <button className={`btn ${saveDanger ? 'btn-danger' : 'btn-primary'}`} onClick={onSave} disabled={saving || saveDisabled}>
      {saving ? <span className="btn-loading"><span className="spinner"/>Processing…</span> : saveLabel}
    </button>
  </div>
);

/* ─── CONFIRM MODAL ──────────────────────────── */
export const ConfirmModal = ({ title, message, confirmLabel = 'Delete', onClose, onConfirm, danger = true, requireTyping = null }) => {
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    onConfirm();
  };

  const canConfirm = !requireTyping || typed === requireTyping;

  return (
    <Modal onClose={onClose} size="sm">
      <div className="confirm-modal-body">
        <div className={`confirm-icon ${danger ? 'danger' : 'warning'}`}>{danger ? '🗑️' : '⚠️'}</div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        {requireTyping && (
          <div className="confirm-type-wrap">
            <label>Type <strong>{requireTyping}</strong> to confirm:</label>
            <input className="form-input" placeholder={requireTyping} value={typed} onChange={e => setTyped(e.target.value)} />
          </div>
        )}
      </div>
      <ModalFooter
        onClose={onClose} onSave={handle}
        saveLabel={loading ? 'Processing…' : confirmLabel}
        saving={loading} saveDisabled={!canConfirm} saveDanger={danger}
      />
    </Modal>
  );
};

/* ─── TOAST ──────────────────────────────────── */
export const Toast = ({ msg, type = 'success', onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span>{msg}</span>
      <button className="toast-close" onClick={onDone}>✕</button>
    </div>
  );
};

export const useToast = () => {
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const ToastEl = toast ? <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} /> : null;
  return [showToast, ToastEl];
};

/* ─── PAGINATION ─────────────────────────────── */
export const Pagination = ({ page, total, perPage, onChange }) => {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="pagination">
      <span className="page-info">Showing {start}–{end} of {total}</span>
      <div className="page-btns">
        <button className="page-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>‹ Prev</button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button key={i} className={`page-btn ${page === i + 1 ? 'page-active' : ''}`} onClick={() => onChange(i + 1)}>{i + 1}</button>
        ))}
        <button className="page-btn" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next ›</button>
      </div>
    </div>
  );
};

/* ─── STAT CARD ──────────────────────────────── */
export const StatCard = ({ icon, color, label, value, badge, badgeType = 'up' }) => (
  <div className="stat-card">
    <div className="sc-top">
      <div className="sc-icon" style={{ background: color + '20' }}>{icon}</div>
      {badge && <div className={`sc-badge ${badgeType}`}>{badge}</div>}
    </div>
    <div className="sc-num">{value}</div>
    <div className="sc-label">{label}</div>
  </div>
);

/* ─── EMPTY STATE ────────────────────────────── */
export const EmptyState = ({ icon = '📭', text = 'No records found', action, actionLabel }) => (
  <div className="empty-state-page">
    <span>{icon}</span>
    <p>{text}</p>
    {action && <button className="btn btn-secondary" onClick={action}>{actionLabel || 'Clear filters'}</button>}
  </div>
);

/* ─── FORM HELPERS ───────────────────────────── */
export const Field = ({ label, field, type = 'text', options, value, onChange, error, placeholder, rows, required }) => (
  <div className="form-group">
    <label className="form-label">{label}{required && <span className="req">*</span>}</label>
    {options ? (
      <select className={`form-select${error ? ' input-error' : ''}`} value={value} onChange={e => onChange(field, e.target.value)}>
        {options.map(o => <option key={typeof o === 'object' ? o.value : o} value={typeof o === 'object' ? o.value : o}>{typeof o === 'object' ? o.label : o}</option>)}
      </select>
    ) : rows ? (
      <textarea className={`form-textarea${error ? ' input-error' : ''}`} rows={rows} placeholder={placeholder || label} value={value || ''} onChange={e => onChange(field, e.target.value)} />
    ) : (
      <input className={`form-input${error ? ' input-error' : ''}`} type={type} placeholder={placeholder || ''} value={value || ''} onChange={e => onChange(field, e.target.value)} />
    )}
    {error && <div className="field-error">{error}</div>}
  </div>
);

/* ─── SEARCH BAR ─────────────────────────────── */
export const SearchBar = ({ value, onChange, placeholder = 'Search…' }) => (
  <div className="search-input">
    <span>🔍</span>
    <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    {value && <button className="clear-search" onClick={() => onChange('')}>✕</button>}
  </div>
);

/* ─── SECTION TITLE ──────────────────────────── */
export const SectionTitle = ({ children }) => (
  <div className="edit-section-title">{children}</div>
);

/* ─── INFO ROW ───────────────────────────────── */
export const InfoRow = ({ icon, label, value }) => (
  <div className="info-row">
    <div className="info-icon">{icon}</div>
    <div className="info-label">{label}</div>
    <div className="info-value">{value || '—'}</div>
  </div>
);

export const fakeDelay = (ms = 700) => new Promise(r => setTimeout(r, ms));

export const exportCSV = (headers, rows, filename) => {
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv,' + encodeURIComponent(csv);
  a.download = filename;
  a.click();
};
