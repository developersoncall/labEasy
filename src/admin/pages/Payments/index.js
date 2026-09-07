import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  paymentAccountService, ACCOUNT_KINDS, kindLabel, accountDetail,
} from '../../../services/paymentAccountService.js';
import { Toast, Modal, ConfirmModal, EmptyState } from '../../components/Shared';

/**
 * Where patients send money.
 *
 * A UPI ID, a mobile number, a scan-to-pay QR image or bank details — set up
 * once here and shown at the counter when a payment is taken. Nothing on this
 * screen moves money; it is the destination and the record of which one was
 * used, so a settlement statement can later be reconciled against it.
 *
 * These are the platform's own accounts. A laboratory that sets up its own
 * gets those instead; this is what every lab falls back to.
 */

const emptyForm = {
  id: null, kind: 'upi', label: '', upiId: '', phone: '', qrPath: '',
  accountName: '', bankName: '', accountNumber: '', ifsc: '',
  instructions: '', isActive: true, isDefault: false, sortOrder: 0,
};

const fromRow = (a) => ({
  id: a.id,
  kind: a.kind || 'upi',
  label: a.label || '',
  upiId: a.upi_id || '',
  phone: a.phone || '',
  qrPath: a.qr_path || '',
  accountName: a.account_name || '',
  bankName: a.bank_name || '',
  accountNumber: a.account_number || '',
  ifsc: a.ifsc || '',
  instructions: a.instructions || '',
  isActive: a.is_active !== false,
  isDefault: !!a.is_default,
  sortOrder: a.sort_order ?? 0,
});

const KIND_ICON = { upi: '🔗', qr: '📱', phone: '☎️', bank: '🏦', cash: '💵', other: '💳' };

const Payments = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);

  const toast_ = (msg, type = 'success') => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { accounts, schemaMissing: missing } = await paymentAccountService.list();
      setRows(accounts);
      setSchemaMissing(missing);
    } catch (e) {
      toast_(e.message || 'Could not load payment options', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const pickQr = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      // The previous image is dropped only once the new one is safely stored.
      const previous = form.qrPath;
      const { path } = await paymentAccountService.uploadQr(file, { labId: null });
      set('qrPath', path);
      if (previous && previous !== path) await paymentAccountService.removeQr(previous);
      toast_('QR image uploaded');
    } catch (err) {
      toast_(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await paymentAccountService.save(form, { labId: null });
      setForm(null);
      await load();
      toast_('Payment option saved');
    } catch (e) {
      toast_(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const needs = (kind) => ({
    upi: kind === 'upi' || kind === 'qr',
    phone: kind === 'phone' || kind === 'qr',
    qr: kind === 'qr',
    bank: kind === 'bank',
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="ph-title">Payment Options</div>
          <div className="ph-sub">
            The UPI IDs, numbers and QR codes patients pay into — shown at the counter when a
            payment is recorded
          </div>
        </div>
        {!schemaMissing && (
          <button className="btn btn-primary" onClick={() => setForm({ ...emptyForm })}>
            ＋ Add payment option
          </button>
        )}
      </div>

      {schemaMissing ? (
        <div className="card"><div className="card-body">
          <p style={{ fontSize: '13.5px', color: 'var(--text-2)' }}>
            Payment options need <code>payment-options.sql</code> to be run in the Supabase SQL
            Editor. It creates the <code>payment_accounts</code> table and the{' '}
            <code>payment-qr</code> storage bucket.
          </p>
        </div></div>
      ) : loading ? (
        <div className="card"><div className="card-body">Loading…</div></div>
      ) : rows.length === 0 ? (
        <div className="card"><div className="card-body">
          <EmptyState
            icon="💳"
            message="No payment options yet. Add a UPI ID or a QR code so labs have somewhere to send patients."
            action={(
              <button className="btn btn-primary" onClick={() => setForm({ ...emptyForm })}>
                ＋ Add payment option
              </button>
            )}
          />
        </div></div>
      ) : (
        <div className="card">
          <div className="card-header"><div className="card-title">Platform payment options</div></div>
          <div className="card-body" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Option</th>
                  <th>Details</th>
                  <th>QR</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>
                        <span style={{ marginRight: 6 }}>{KIND_ICON[a.kind] || '💳'}</span>
                        {a.label || kindLabel(a.kind)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                        {kindLabel(a.kind)}
                        {a.is_default && (
                          <span style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 700 }}>
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontSize: '12.5px' }}>
                        {accountDetail(a) || '—'}
                      </div>
                      {a.account_name && (
                        <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                          {[a.account_name, a.bank_name].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td>
                      {a.qr_path ? (
                        <a
                          href={paymentAccountService.qrUrl(a.qr_path)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={paymentAccountService.qrUrl(a.qr_path)}
                            alt="Payment QR"
                            style={{ height: 44, width: 44, objectFit: 'contain', borderRadius: 6 }}
                          />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-3)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${a.is_active ? 'badge-success' : 'badge-muted'}`}>
                        {a.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {!a.is_default && a.is_active && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={async () => {
                            await paymentAccountService.makeDefault(a.id);
                            await load();
                            toast_('Default payment option updated');
                          }}
                        >
                          Make default
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={async () => {
                          await paymentAccountService.setActive(a.id, !a.is_active);
                          await load();
                        }}
                      >
                        {a.is_active ? 'Hide' : 'Show'}
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setForm(fromRow(a))}>
                        Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(a)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- editor -- */}
      {form && (
        <Modal size="lg" onClose={() => setForm(null)}>
          <div className="modal-header">
            <div className="modal-user-name" style={{ fontSize: '1rem' }}>
              {form.id ? 'Edit payment option' : 'Add payment option'}
            </div>
            <button className="modal-close" onClick={() => setForm(null)}>✕</button>
          </div>
          <div className="modal-body" style={{ paddingTop: 16 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.kind} onChange={(e) => set('kind', e.target.value)}>
                {ACCOUNT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
              <div className="field-error" style={{ color: 'var(--text-3)', fontWeight: 500 }}>
                {ACCOUNT_KINDS.find((k) => k.value === form.kind)?.hint}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Name it</label>
              <input
                className="form-input"
                placeholder="Counter UPI, Reception QR…"
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
              />
            </div>

            {needs(form.kind).upi && (
              <div className="form-group">
                <label className="form-label">
                  UPI ID {form.kind === 'upi' ? '*' : '(optional)'}
                </label>
                <input
                  className="form-input"
                  placeholder="labeasy@okhdfcbank"
                  value={form.upiId}
                  onChange={(e) => set('upiId', e.target.value)}
                />
              </div>
            )}

            {needs(form.kind).phone && (
              <div className="form-group">
                <label className="form-label">
                  Mobile number {form.kind === 'phone' ? '*' : '(optional)'}
                </label>
                <input
                  className="form-input"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </div>
            )}

            {needs(form.kind).bank && (
              <>
                <div className="form-group">
                  <label className="form-label">Account holder</label>
                  <input className="form-input" value={form.accountName} onChange={(e) => set('accountName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bank</label>
                  <input className="form-input" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Account number *</label>
                  <input className="form-input" value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">IFSC</label>
                  <input className="form-input" value={form.ifsc} onChange={(e) => set('ifsc', e.target.value)} />
                </div>
              </>
            )}

            {needs(form.kind).qr && (
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">QR image *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      height: 76, width: 76, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', border: '1px dashed var(--surface-3)',
                      borderRadius: 8, overflow: 'hidden',
                    }}
                  >
                    {form.qrPath ? (
                      <img
                        src={paymentAccountService.qrUrl(form.qrPath)}
                        alt="QR preview"
                        style={{ maxHeight: 72, maxWidth: 72, objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>No image</span>
                    )}
                  </div>
                  <div>
                    <button
                      className="btn btn-sm btn-ghost"
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? '⏳ Uploading…' : form.qrPath ? 'Replace image' : 'Upload image'}
                    </button>
                    {form.qrPath && (
                      <button
                        className="btn btn-sm btn-ghost"
                        type="button"
                        onClick={async () => {
                          await paymentAccountService.removeQr(form.qrPath);
                          set('qrPath', '');
                        }}
                      >
                        Remove
                      </button>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                      PNG, JPEG or WebP, under 2 MB.
                    </div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={pickQr}
                  />
                </div>
              </div>
            )}

            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Note for the counter</label>
              <input
                className="form-input"
                placeholder="Ask the patient to enter the bill number as the reference"
                value={form.instructions}
                onChange={(e) => set('instructions', e.target.value)}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1/-1', display: 'flex', gap: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                Active
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
                Offer this one first
              </label>
            </div>
          </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving || uploading}>
              {saving ? '⏳ Saving…' : 'Save option'}
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this payment option?"
          message="Labs will no longer see it at the counter. Payments already recorded against it keep their history."
          confirmLabel="Delete option"
          danger
          onConfirm={async () => {
            await paymentAccountService.remove(confirmDelete);
            setConfirmDelete(null);
            await load();
            toast_('Payment option deleted');
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
};

export default Payments;
