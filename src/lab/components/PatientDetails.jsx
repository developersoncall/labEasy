import { useCallback, useEffect, useState } from 'react';
import {
  FaPen, FaFilePdf, FaDownload, FaHistory, FaRupeeSign, FaFlask,
} from 'react-icons/fa';
import Modal from '../../components/common/Modal.jsx';
import { patientService, ageOf } from '../../services/patientService.js';
import { labReportService } from '../../services/labReportService.js';
import { STATUS_LABELS, STATUS_STYLES } from '../../services/labBookingService.js';
import { dueOf } from '../../services/billingService.js';
import { formatCurrency } from '../../utils/helpers.js';
import { itemsLabel, Alert } from './ui.jsx';

/** A bordered section: hairline box, tinted header strip, padded body. */
function Panel({ title, right, children, bodyClass = 'p-4' }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-baseline justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{title}</h4>
        {right}
      </header>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children || <span className="text-gray-300">—</span>}</dd>
    </div>
  );
}

/**
 * One patient: who they are, and everything this lab has ever done for them.
 *
 * The history is the point. A result only means something next to the last
 * one, and a receptionist asked "when was I last here?" should be able to
 * answer without opening five bookings.
 */
export default function PatientDetails({ patient, canEdit, onEdit, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHistory(await patientService.history(patient.id));
    } catch (err) {
      setError(err?.message || 'Could not load this patient’s history.');
    } finally {
      setLoading(false);
    }
  }, [patient.id]);

  useEffect(() => { load(); }, [load]);

  const download = async (report) => {
    try {
      const url = await labReportService.downloadUrl(report.file_path || report.report_url);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (err) {
      setError(err?.message || 'Could not open that report.');
    }
  };

  const age = ageOf(patient);
  const totalBilled = history.reduce((n, b) => n + Number(b.total_amount || 0), 0);
  const totalDue = history.reduce((n, b) => n + dueOf(b), 0);

  return (
    <Modal open onClose={onClose} title={patient.full_name} maxWidth="max-w-3xl">
      <div className="space-y-5">
        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

        <Panel
          title="Details"
          right={
            canEdit && (
              <button
                type="button"
                className="text-[11px] font-semibold text-primary-600 hover:text-primary-700"
                onClick={onEdit}
              >
                <FaPen className="mr-1 inline" aria-hidden="true" /> Edit
              </button>
            )
          }
        >
          <dl className="grid gap-4 sm:grid-cols-3">
            <Field label="Patient ID">
              <span className="font-mono text-xs">{patient.patient_ref}</span>
            </Field>
            <Field label="Phone">{patient.phone}</Field>
            <Field label="Email">{patient.email}</Field>
            <Field label="Age">{age != null ? `${age} years` : null}</Field>
            <Field label="Gender">{patient.gender}</Field>
            <Field label="Blood group">{patient.blood_group}</Field>
            <Field label="Registered">
              {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : null}
            </Field>
            <Field label="Last visit">
              {patient.last_visit_at ? new Date(patient.last_visit_at).toLocaleDateString() : null}
            </Field>
            <Field label="Visits">{patient.visits || 0}</Field>
          </dl>
          {(patient.address || patient.notes) && (
            <div className="mt-4 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
              <Field label="Address">
                {[patient.address, patient.city, patient.pincode].filter(Boolean).join(', ')}
              </Field>
              <Field label="Notes">{patient.notes}</Field>
            </div>
          )}
        </Panel>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Visits', patient.visits || 0, <FaHistory key="v" />, 'text-primary-600'],
            ['Billed to date', formatCurrency(totalBilled), <FaRupeeSign key="b" />, 'text-gray-700'],
            ['Still owed', formatCurrency(totalDue), <FaRupeeSign key="d" />,
              totalDue > 0 ? 'text-amber-600' : 'text-emerald-600'],
          ].map(([label, value, icon, tone]) => (
            <div key={label} className="rounded-xl border border-gray-200 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                <span className={tone} aria-hidden="true">{icon}</span> {label}
              </p>
              <p className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>{value}</p>
            </div>
          ))}
        </div>

        <Panel title={`Visit history · ${history.length}`} bodyClass="p-0">
          {loading ? (
            <p className="px-4 py-3 text-sm text-gray-400">Loading…</p>
          ) : history.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              No bookings recorded for this patient yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {history.map((b) => {
                const reports = Array.isArray(b.medical_reports)
                  ? b.medical_reports
                  : b.medical_reports ? [b.medical_reports] : [];
                const report = reports.find((r) => r.file_path) || reports[0] || null;
                const due = dueOf(b);
                return (
                  <li key={b.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900">
                            {b.scheduled_date || String(b.created_at).slice(0, 10)}
                          </span>
                          <span
                            className={`badge whitespace-nowrap ${STATUS_STYLES[b.workflow_status] || ''}`}
                          >
                            {STATUS_LABELS[b.workflow_status] || b.workflow_status}
                          </span>
                          {due > 0 && (
                            <span className="badge whitespace-nowrap bg-amber-100 text-amber-800">
                              {formatCurrency(due)} due
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 flex items-start gap-1.5 text-xs text-gray-500">
                          <FaFlask className="mt-0.5 shrink-0 text-gray-300" aria-hidden="true" />
                          <span className="min-w-0">{itemsLabel(b.items)}</span>
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-gray-400">
                          {[b.bill_no, b.booking_ref].filter(Boolean).join(' · ')}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-gray-900">
                          {formatCurrency(b.total_amount)}
                        </span>
                        {report?.file_path ? (
                          <button
                            type="button"
                            className="btn-soft whitespace-nowrap px-3 py-1.5 text-xs"
                            onClick={() => download(report)}
                          >
                            <FaFilePdf aria-hidden="true" /> Report
                          </button>
                        ) : (
                          <span className="whitespace-nowrap text-xs text-gray-300">No report</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <button type="button" className="btn-outline w-full" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
