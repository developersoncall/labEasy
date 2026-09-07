import { useRef, useState } from 'react';
import { FaFilePdf, FaPlus, FaTimes, FaInfoCircle } from 'react-icons/fa';
import { DOC_TYPES, docTypeLabel } from '../../services/labDocumentService.js';

const MAX_MB = 10;

/**
 * Choose the PDFs a laboratory is verified against, before they are uploaded.
 *
 * Purely a staging list: the parent holds the chosen files and uploads them
 * once the lab row exists (a document needs a lab_id to belong to). That is
 * also why this is a controlled component — the registration flow keeps the
 * selection across its steps.
 */
export default function DocumentPicker({ value = [], onChange, disabled = false }) {
  const inputRef = useRef(null);
  const [docType, setDocType] = useState('license');
  const [error, setError] = useState('');

  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-picked after a removal
    if (!file) return;
    if (file.type && file.type !== 'application/pdf') {
      setError('Documents must be PDF files.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Each file must be under ${MAX_MB} MB.`);
      return;
    }
    setError('');
    onChange([...value, { file, docType, title: docTypeLabel(docType) }]);
  };

  const removeAt = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[190px] flex-1">
          <label className="form-label" htmlFor="doc-type">Document type</label>
          <select
            id="doc-type"
            className="input-field"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            disabled={disabled}
          >
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn-outline whitespace-nowrap px-4 py-2.5"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <FaPlus aria-hidden="true" /> Add PDF
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={pick}
          disabled={disabled}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      {value.length > 0 ? (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
          {value.map((entry, i) => (
            <li key={`${entry.file.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
              <FaFilePdf className="shrink-0 text-primary-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{entry.file.name}</p>
                <p className="text-xs text-gray-400">
                  {docTypeLabel(entry.docType)} · {Math.max(1, Math.round(entry.file.size / 1024))} KB
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${entry.file.name}`}
                disabled={disabled}
              >
                <FaTimes />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-start gap-2 rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
          <FaInfoCircle className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
          <span>
            Attach your laboratory licence as a PDF. Certificates and proofs help us verify you faster —
            you can also add them later from Lab Settings.
          </span>
        </p>
      )}
    </div>
  );
}
