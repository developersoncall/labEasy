import { useCallback, useEffect, useRef, useState } from 'react';
import { FaSearch, FaUserPlus, FaUserCheck, FaTimes, FaHistory } from 'react-icons/fa';
import { patientService, ageOf, toBookingForm } from '../../services/patientService.js';

/**
 * Find the patient before typing them out again.
 *
 * The register fills itself from bookings, so by the second visit the person is
 * already there — start typing a name or a phone number and they appear, with
 * how many times they have been in. Choosing one fills the rest of the form.
 *
 * Nothing is forced: a first-time patient is simply typed in as before and the
 * database creates the record on save. This box only removes the retyping.
 */
export default function PatientPicker({ labId, value, onPick, onClear, disabled }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const boxRef = useRef(null);

  // Close on a click anywhere else, the way a native combo box behaves.
  useEffect(() => {
    const away = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const search = useCallback(
    async (q) => {
      if (!labId || q.trim().length < 2) {
        setResults([]);
        return;
      }
      setBusy(true);
      try {
        const { patients, schemaMissing: missing } = await patientService.search(labId, q);
        setResults(patients);
        setSchemaMissing(missing);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    },
    [labId],
  );

  // One request per pause in typing, not one per keystroke.
  useEffect(() => {
    const t = setTimeout(() => search(term), 250);
    return () => clearTimeout(t);
  }, [term, search]);

  if (value) {
    const age = ageOf(value);
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-200 bg-primary-50/60 px-4 py-3">
        <FaUserCheck className="shrink-0 text-primary-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {value.full_name}
            <span className="ml-2 font-mono text-[11px] font-normal text-primary-700">
              {value.patient_ref}
            </span>
          </p>
          <p className="truncate text-xs text-gray-600">
            {[value.phone, age != null ? `${age} yrs` : null, value.gender]
              .filter(Boolean)
              .join(' · ') || 'No contact details on file'}
            {value.visits > 0 && ` · ${value.visits} previous visit${value.visits === 1 ? '' : 's'}`}
          </p>
        </div>
        <button
          type="button"
          className="btn-soft shrink-0 px-3 py-1.5 text-xs"
          onClick={onClear}
          disabled={disabled}
        >
          <FaTimes aria-hidden="true" /> Change
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <FaSearch
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
          aria-hidden="true"
        />
        <input
          className="input-field pl-9"
          placeholder="Search an existing patient by name or phone…"
          value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          aria-label="Search existing patients"
          autoComplete="off"
        />
      </div>

      {open && term.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          {schemaMissing ? (
            <p className="px-4 py-3 text-xs text-amber-800">
              The patient register needs phase2.sql to be run in the Supabase SQL Editor.
            </p>
          ) : busy ? (
            <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>
          ) : results.length === 0 ? (
            <div className="px-4 py-3">
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <FaUserPlus className="text-gray-400" aria-hidden="true" />
                No match — fill in the details below and they will be registered automatically.
              </p>
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((p) => {
                const age = ageOf(p);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-primary-50"
                      onClick={() => { onPick(p, toBookingForm(p)); setTerm(''); setOpen(false); }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{p.full_name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {[p.phone, age != null ? `${age} yrs` : null, p.gender]
                            .filter(Boolean).join(' · ') || p.patient_ref}
                        </p>
                      </div>
                      {p.visits > 0 && (
                        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] text-gray-400">
                          <FaHistory aria-hidden="true" /> {p.visits}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
