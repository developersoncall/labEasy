import { useRef, useState } from 'react';
import { FaUpload, FaTrash, FaCheckCircle, FaImage, FaSignature } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import { labAssetService, ASSET_KINDS } from '../../services/labAssetService.js';
import { Card, Alert } from './ui.jsx';

/**
 * How this laboratory's reports look and who signs them.
 *
 * The signature is the point of this screen. Until now a report ended with the
 * words "Approved by" and a name typed in a database; a lab that hands a
 * patient a document with its own signature on it is issuing a report, not
 * printing a table.
 */
function ImageSlot({ kind, labId, currentPath, onChanged }) {
  const meta = ASSET_KINDS[kind];
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Set after an upload so the preview updates even though the path is stable.
  const [bust, setBust] = useState('');

  const url = currentPath ? `${labAssetService.publicUrl(currentPath)}${bust}` : '';

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await labAssetService.upload(labId, kind, file);
      setBust(`?v=${Date.now()}`);
      await onChanged?.();
    } catch (err) {
      setError(err?.message || 'Could not upload that image.');
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await labAssetService.remove(labId, kind, currentPath);
      await onChanged?.();
    } catch (err) {
      setError(err?.message || 'Could not remove that image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        {kind === 'logo' ? <FaImage className="text-gray-400" aria-hidden="true" />
          : <FaSignature className="text-gray-400" aria-hidden="true" />}
        {meta.label}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">{meta.hint}</p>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-200 bg-gray-50">
          {url ? (
            <img src={url} alt={`${meta.label} preview`} className="max-h-14 max-w-[6.5rem] object-contain" />
          ) : (
            <span className="text-[11px] text-gray-400">Nothing yet</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-soft px-3 py-1.5 text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <FaUpload aria-hidden="true" /> {url ? 'Replace' : 'Upload'}
          </button>
          {url && (
            <button
              type="button"
              className="btn-danger-soft px-3 py-1.5 text-xs"
              onClick={clear}
              disabled={busy}
            >
              <FaTrash aria-hidden="true" /> Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={pick}
        />
      </div>
    </div>
  );
}

export default function ReportSettings() {
  const { lab, refreshIdentity } = useAuth();
  const [form, setForm] = useState({
    signatoryName: lab?.signatory_name || '',
    signatoryDesignation: lab?.signatory_designation || '',
    signatoryRegNo: lab?.signatory_reg_no || '',
    reportFooter: lab?.report_footer || '',
    reportHeaderNote: lab?.report_header_note || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await labAssetService.saveBranding(lab.id, form);
      await refreshIdentity();
      setSaved(true);
    } catch (err) {
      setError(err?.message || 'Could not save the report settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!lab?.id) return null;

  return (
    <Card className="p-6">
      <h2 className="text-sm font-bold text-gray-900">Report settings</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        The letterhead, the signature and the footer printed on every report you issue.
      </p>

      {saved && (
        <div className="mt-4">
          <Alert tone="success" onDismiss={() => setSaved(false)}>
            <FaCheckCircle className="mr-1.5 inline" aria-hidden="true" /> Report settings saved.
          </Alert>
        </div>
      )}
      {error && <div className="mt-4"><Alert onDismiss={() => setError('')}>{error}</Alert></div>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ImageSlot kind="logo" labId={lab.id} currentPath={lab.logo_path} onChanged={refreshIdentity} />
        <ImageSlot kind="signature" labId={lab.id} currentPath={lab.signature_path} onChanged={refreshIdentity} />
      </div>

      <form className="mt-5 space-y-3 border-t border-gray-100 pt-5" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="form-label" htmlFor="rs-name">Signatory</label>
            <input
              id="rs-name"
              className="input-field"
              placeholder="Dr A. Sharma"
              value={form.signatoryName}
              onChange={set('signatoryName')}
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave blank to sign with the Lab Admin&apos;s own name.
            </p>
          </div>
          <div>
            <label className="form-label" htmlFor="rs-desig">Designation</label>
            <input
              id="rs-desig"
              className="input-field"
              placeholder="MD, Pathology"
              value={form.signatoryDesignation}
              onChange={set('signatoryDesignation')}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="rs-reg">Registration no.</label>
            <input
              id="rs-reg"
              className="input-field"
              placeholder="Council registration"
              value={form.signatoryRegNo}
              onChange={set('signatoryRegNo')}
            />
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="rs-footer">Footer line</label>
          <input
            id="rs-footer"
            className="input-field"
            placeholder="Results relate only to the sample tested · Please correlate clinically"
            value={form.reportFooter}
            onChange={set('reportFooter')}
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary px-5" disabled={saving}>
            {saving ? 'Saving…' : 'Save report settings'}
          </button>
        </div>
      </form>
    </Card>
  );
}
