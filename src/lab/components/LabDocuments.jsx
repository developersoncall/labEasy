import { useCallback, useEffect, useState } from 'react';
import { FaFilePdf, FaExternalLinkAlt, FaTrash, FaUpload } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import DocumentPicker from '../../components/lab/DocumentPicker.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { labDocumentService, docTypeLabel } from '../../services/labDocumentService.js';
import { Card, Alert } from './ui.jsx';

/**
 * The lab's own verification paperwork.
 *
 * Lives in Lab Settings so a lab that skipped documents at registration — or
 * had e-mail confirmation interrupt it — can still send them while the admin
 * is reviewing. Uploads work while the lab is `pending`, which is the whole
 * point of them.
 */
export default function LabDocuments() {
  const { lab, user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    if (!lab?.id) return;
    setLoading(true);
    try {
      const { documents, schemaMissing: missing } = await labDocumentService.listForLab(lab.id);
      setDocs(documents);
      setSchemaMissing(missing);
    } catch (err) {
      setError(err?.message || 'Could not load your documents.');
    } finally {
      setLoading(false);
    }
  }, [lab?.id]);

  useEffect(() => { load(); }, [load]);

  const uploadPending = async () => {
    if (!pending.length) return;
    setSaving(true);
    setError('');
    try {
      const { failed } = await labDocumentService.uploadMany(lab.id, pending, user?.id);
      if (failed.length) setError(`${failed.length} file(s) failed: ${failed[0].message}`);
      setPending([]);
      await load();
    } catch (err) {
      setError(err?.message || 'Upload failed.');
    } finally {
      setSaving(false);
    }
  };

  const open = async (doc) => {
    try {
      const url = await labDocumentService.viewUrl(doc.file_path);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (err) {
      setError(err?.message || 'Could not open that document.');
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-bold text-gray-900">Verification documents</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        Licence and certificates the platform admin verifies your laboratory against.
      </p>

      {error && <div className="mt-4"><Alert onDismiss={() => setError('')}>{error}</Alert></div>}

      {schemaMissing ? (
        <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Document storage needs section 19 of <code className="font-mono">newSQL.html</code> to be run in
          the Supabase SQL Editor.
        </p>
      ) : (
        <>
          {loading ? (
            <p className="mt-4 text-sm text-gray-400">Loading…</p>
          ) : docs.length ? (
            <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <FaFilePdf className="shrink-0 text-primary-600" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {d.title || docTypeLabel(d.doc_type)}
                    </p>
                    <p className="truncate text-xs text-gray-400">
                      {d.file_name}
                      {d.file_size ? ` · ${Math.max(1, Math.round(d.file_size / 1024))} KB` : ''}
                      {` · ${new Date(d.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button type="button" className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => open(d)}>
                    <FaExternalLinkAlt aria-hidden="true" /> Open
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    onClick={() => setConfirmDelete(d)}
                    aria-label={`Remove ${d.file_name}`}
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">
              No documents uploaded yet.
            </p>
          )}

          <div className="mt-5 border-t border-gray-100 pt-5">
            <DocumentPicker value={pending} onChange={setPending} disabled={saving} />
            {pending.length > 0 && (
              <button type="button" className="btn-primary mt-3 w-full" onClick={uploadPending} disabled={saving}>
                <FaUpload aria-hidden="true" />
                {saving ? 'Uploading…' : `Upload ${pending.length} document${pending.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        danger
        title="Remove this document?"
        message="The PDF is deleted from storage. If your lab is still being reviewed, the admin will no longer be able to see it."
        detail={confirmDelete?.file_name}
        confirmLabel="Remove document"
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          await labDocumentService.remove(confirmDelete);
          setConfirmDelete(null);
          await load();
        }}
      />
    </Card>
  );
}
