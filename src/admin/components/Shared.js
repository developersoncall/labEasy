import React, { useEffect, useState } from 'react';

/* ─── AVATAR ─────────────────────────────────────── */
export const Avatar = ({ name, size = 34, bg = 'var(--accent)' }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontWeight: 800, fontSize: size * 0.38,
    fontFamily: 'Lato, sans-serif', flexShrink: 0,
  }}>
    {name?.[0]?.toUpperCase() || '?'}
  </div>
);

/* ─── TOAST ──────────────────────────────────────── */
export const Toast = ({ msg, type = 'success', onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  return (
    <div className={`toast toast-${type}`}>
      <span>{icons[type]}</span>
      <span>{msg}</span>
    </div>
  );
};

/* ─── MODAL SHELL ────────────────────────────────── */
export const Modal = ({ children, size = 'lg', onClose }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const fn = e => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', fn);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', fn); };
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal modal-${size}`}>{children}</div>
    </div>
  );
};

/* ─── CONFIRM MODAL ──────────────────────────────── */
export const ConfirmModal = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onClose, children }) => {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    onConfirm();
  };
  return (
    <Modal size="sm" onClose={onClose}>
      <div className="modal-header">
        <div className="modal-user-name" style={{ fontSize: '1rem' }}>{title}</div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body" style={{ paddingTop: 16 }}>
        {message && <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>{message}</p>}
        {children}
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={handle} disabled={loading}>
          {loading ? '⏳ Processing…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

/* ─── FORM FIELD ─────────────────────────────────── */
export const Field = ({ label, error, children }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    {children}
    {error && <div className="field-error">{error}</div>}
  </div>
);

/* ─── STATUS BADGE ───────────────────────────────── */
export const Badge = ({ status }) => {
  const map = {
    active: 'green', inactive: 'red', blocked: 'red',
    success: 'green', pending: 'yellow', failed: 'red', refunded: 'blue',
    completed: 'green', confirmed: 'blue', in_progress: 'yellow', cancelled: 'red',
    open: 'red', in_progress_ticket: 'yellow', resolved: 'green',
    verified: 'green', flagged: 'red', on_leave: 'yellow',
    available: 'green', unavailable: 'gray',
  };
  const label = status?.replace('_', ' ');
  const color = map[status] || 'gray';
  return <span className={`badge badge-${color}`}>{label}</span>;
};

/* ─── EMPTY STATE ────────────────────────────────── */
export const EmptyState = ({ icon = '📋', message = 'Nothing here yet', action }) => (
  <div className="empty-state-page">
    <span>{icon}</span>
    <p>{message}</p>
    {action && <button className="btn btn-secondary" onClick={action.fn}>{action.label}</button>}
  </div>
);

/* ─── SECTION TITLE ──────────────────────────────── */
export const SectionTitle = ({ children }) => (
  <div className="edit-section-title">{children}</div>
);
