import { useCallback, useEffect, useState } from 'react';
import {
  FaFilePdf, FaDownload, FaTrash, FaSyncAlt, FaCheck, FaCircle, FaTimesCircle, FaClipboardList,
} from 'react-icons/fa';
import Modal from '../../components/common/Modal.jsx';
import UploadReportModal from './UploadReportModal.jsx';
import PaymentModal from './PaymentModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import ReportBuilder from './ReportBuilder.jsx';
import { nextStepFor, runSimpleStep } from './nextStep.jsx';
import { StatusPill, PaymentPill, itemsLabel } from './ui.jsx';
import useAuth from '../../hooks/useAuth.js';
import { ROLES } from '../../config/platform.js';
import { labBookingService, STATUS_LABELS, WORKFLOW_STAGES } from '../../services/labBookingService.js';
import { labReportService } from '../../services/labReportService.js';
import {
  reportResultService, FLAG_STYLES, FLAG_LABELS,
} from '../../services/reportResultService.js';
import { formatCurrency } from '../../utils/helpers.js';

/**
 * Everything known about one booking — and the one thing it is waiting for.
 *
 * Opened from the Details button on every list, so any member of the lab can
 * look a booking up. What it offers to *do* is role-aware and comes from the
 * shared nextStepFor(), which mirrors the database's workflow trigger: a
 * reportist opening a booking whose testing is finished gets the upload
 * button right here rather than being sent back to a queue.
 *
 * The timeline is built from the stage timestamps on the row plus the
 * `booking_activity` rows the database writes on every transition, so it
 * shows what actually happened rather than what this screen assumed.
 */

/** The pipeline as a checklist: each stage and the column that dates it. */
const TIMELINE = [
  ['booked', 'Booked', 'created_at'],
  ['payment_completed', 'Payment received', null],
  ['sent_for_testing', 'Sent for testing', 'sent_to_testing_at'],
  ['testing_in_progress', 'Testing started', 'testing_started_at'],
  ['testing_completed', 'Testing completed', 'testing_completed_at'],
  ['report_uploaded', 'Report uploaded', 'report_uploaded_at'],
  ['completed', 'Completed', 'completed_at'],
];

/** Stages at which entering or revising results makes sense. */
const CAN_BUILD_REPORT = [
  'testing_in_progress', 'testing_completed', 'report_pending', 'report_uploaded',
];

const when = (v) => (v ? new Date(v).toLocaleString() : null);

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-gray-900">{children || '—'}</dd>
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{children}</h4>
      {right}
    </div>
  );
}

/** Stage checklist: reached stages are solid, the current one is ringed. */
function Timeline({ booking, activity }) {
  const currentIndex = WORKFLOW_STAGES.indexOf(booking.workflow_status);

  // A stage counts as reached if it has a timestamp, if the activity log
  // recorded it, or if the booking has simply moved past it (payment, for
  // instance, has no column of its own).
  const reachedAt = (stage, col) => {
    if (col && booking[col]) return when(booking[col]);
    const hit = activity.find((a) => a.to_status === stage);
    if (hit) return when(hit.created_at);
    const idx = WORKFLOW_STAGES.indexOf(stage);
    return idx >= 0 && currentIndex > idx ? '' : null;
  };

  return (
    <ol className="relative">
      {TIMELINE.map(([stage, label, col], i) => {
        const at = reachedAt(stage, col);
        const done = at !== null;
        const isCurrent = stage === booking.workflow_status;
        const last = i === TIMELINE.length - 1;

        return (
          <li key={stage} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                className={`absolute left-[8px] top-5 h-full w-0.5 ${done ? 'bg-primary-200' : 'bg-gray-100'}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`relative z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 text-[8px] ${
                isCurrent
                  ? 'border-primary-600 bg-primary-600 text-white ring-4 ring-primary-100'
                  : done
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-gray-200 bg-white'
              }`}
            >
              {done ? (
                <FaCheck aria-hidden="true" />
              ) : (
                <FaCircle className="text-[5px] text-gray-300" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm leading-tight ${done ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                {label}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700">
                    now
                  </span>
                )}
              </p>
              {at ? <p className="mt-0.5 text-xs tabular-nums text-gray-400">{at}</p> : null}
            </div>
          </li>
        );
      })}

      {booking.workflow_status === 'cancelled' && (
        <li className="relative flex gap-3">
          <span className="relative z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-red-100 text-[9px] text-red-600">
            <FaTimesCircle aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-red-700">Cancelled</p>
            {booking.cancelled_at && (
              <p className="mt-0.5 text-xs tabular-nums text-gray-400">{when(booking.cancelled_at)}</p>
            )}
          </div>
        </li>
      )}
    </ol>
  );
}

export default function BookingDetails({ booking, onClose, onChanged, initialAction }) {
  const { role, user, labId } = useAuth();
  const [activity, setActivity] = useState([]);
  const [reports, setReports] = useState([]);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState('');
  const [uploadMode, setUploadMode] = useState(null); // 'new' | 'replace'
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!booking) return;
    const [acts, reps, vals] = await Promise.all([
      labBookingService.activity(booking.id).catch(() => []),
      labReportService.forBooking(booking.id).catch(() => []),
      reportResultService.listForBooking(booking.id).catch(() => ({ values: [] })),
    ]);
    setActivity(acts);
    setReports(reps);
    setResults(vals.values || []);
  }, [booking]);

  useEffect(() => {
    let alive = true;
    if (!booking) return undefined;
    setBusy(true);
    setError('');
    setShowLog(false);
    // Opened straight onto an action, from a row's pending-step button.
    setUploadMode(initialAction === 'upload' ? 'new' : null);
    setPaymentOpen(initialAction === 'payment');
    refresh().finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [booking, initialAction, refresh]);

  const report = reports[0] || null;
  const isLabAdmin = role === ROLES.LAB_ADMIN;
  // Whoever may upload a report may also correct one that is already there.
  const canReplaceReport = isLabAdmin || role === ROLES.REPORTIST;
  const step = nextStepFor(booking, role, report);

  const runStep = async (kind) => {
    if (kind === 'upload') return setUploadMode('new');
    if (kind === 'payment') return setPaymentOpen(true);
    setError('');
    setBusyAction(true);
    try {
      await runSimpleStep(kind, booking, { userId: user?.id, report });
      await refresh();
      await onChanged?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || 'That action was refused.');
    } finally {
      setBusyAction(false);
    }
    return undefined;
  };

  const download = async (r) => {
    try {
      const url = await labReportService.downloadUrl(r.file_path || r.report_url);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (err) {
      setError(err?.message || 'Could not open that report.');
    }
  };

  if (!booking) return null;

  const items = Array.isArray(booking.items) ? booking.items : [];

  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      title={`Booking ${booking.booking_ref || booking.id.slice(0, 8)}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* ---- where it is ---- */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <StatusPill status={booking.workflow_status} />
          <PaymentPill status={booking.payment_status} />
          <span className="ml-auto text-xs text-gray-500">
            {booking.scheduled_date}
            {booking.scheduled_time ? ` · ${booking.scheduled_time}` : ''}
          </span>
        </div>

        {error && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {/* ---- the pending action ---- */}
        {(step || isLabAdmin) && (
          <section className="rounded-xl border border-primary-100 bg-primary-50/60 p-4">
            <SectionTitle>{step && step.kind !== 'blocked' ? 'Waiting on you' : 'Actions'}</SectionTitle>
            <div className="flex flex-wrap items-center gap-2">
              {step?.kind === 'blocked' && <span className="text-sm text-amber-700">{step.label}</span>}
              {step && step.kind !== 'blocked' && (
                <button
                  type="button"
                  className={`${step.tone} px-4 py-2 text-sm`}
                  disabled={busyAction}
                  onClick={() => runStep(step.kind)}
                >
                  {step.icon} {busyAction ? 'Working…' : step.label}
                </button>
              )}
              {!step && isLabAdmin && (
                <span className="text-sm text-gray-500">Nothing is pending on this booking.</span>
              )}
              {CAN_BUILD_REPORT.includes(booking.workflow_status)
                && [ROLES.LAB_ADMIN, ROLES.TESTER, ROLES.REPORTIST].includes(role) && (
                <button
                  type="button"
                  className="btn-outline px-4 py-2 text-sm"
                  onClick={() => setBuildOpen(true)}
                >
                  <FaClipboardList aria-hidden="true" /> {results.length ? 'Edit report' : 'Create report'}
                </button>
              )}
              {isLabAdmin && (
                <button
                  type="button"
                  className="btn-ghost ml-auto px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setConfirmDelete(true)}
                >
                  <FaTrash aria-hidden="true" /> Delete booking
                </button>
              )}
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="min-w-0 space-y-6">
            {/* ---- patient ---- */}
            <section>
              <SectionTitle>Patient</SectionTitle>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Field label="Name">{booking.patient_name || 'Walk-in patient'}</Field>
                <Field label="Phone">{booking.patient_phone}</Field>
                <Field label="Email">{booking.patient_email}</Field>
                <Field label="Age">{booking.patient_age}</Field>
                <Field label="Gender">{booking.patient_gender}</Field>
                <Field label="Source">{booking.source === 'walk_in' ? 'Walk-in' : booking.source}</Field>
              </dl>
              {booking.address && (
                <div className="mt-4">
                  <Field label="Address">{[booking.address, booking.city].filter(Boolean).join(', ')}</Field>
                </div>
              )}
            </section>

            {/* ---- tests & money ---- */}
            <section>
              <SectionTitle>Tests &amp; payment</SectionTitle>
              {items.length ? (
                <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
                  {items.map((t, i) => (
                    <li key={t.id || i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="min-w-0 truncate text-gray-800">{t.name || t.title || 'Test'}</span>
                      <span className="shrink-0 font-semibold text-gray-900">{formatCurrency(t.price)}</span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-2.5 text-sm font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(booking.total_amount)}</span>
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-gray-400">{itemsLabel(booking.items)}</p>
              )}
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <Field label="Paid">{formatCurrency(booking.amount_paid)}</Field>
                <Field label="Method">{booking.payment_method}</Field>
                <Field label="Stage">{STATUS_LABELS[booking.workflow_status]}</Field>
              </dl>
            </section>

            {/* ---- measured results ---- */}
            {results.length > 0 && (
              <section>
                <SectionTitle>Results</SectionTitle>
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Parameter</th>
                        <th className="px-3 py-2 text-left font-semibold">Result</th>
                        <th className="px-3 py-2 text-left font-semibold">Reference</th>
                        <th className="px-3 py-2 text-left font-semibold">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {results.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 text-gray-800">
                            {r.parameter_name}
                            {r.group_label && (
                              <span className="ml-1.5 text-xs text-gray-400">{r.group_label}</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 font-semibold text-gray-900">
                            {r.value || '—'}
                            {r.unit && <span className="ml-1 font-normal text-gray-400">{r.unit}</span>}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{r.ref_range || '—'}</td>
                          <td className="px-3 py-2">
                            {r.flag ? (
                              <span className={`badge ${FLAG_STYLES[r.flag]}`}>{FLAG_LABELS[r.flag]}</span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ---- report ---- */}
            <section>
              <SectionTitle>Report</SectionTitle>
              {report ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
                  <FaFilePdf className="shrink-0 text-lg text-primary-600" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {report.file_name || report.title || report.report_ref}
                    </p>
                    <p className="text-xs text-gray-400">
                      {report.report_ref}
                      {report.created_at ? ` · ${new Date(report.created_at).toLocaleString()}` : ''}
                      {report.file_size ? ` · ${Math.round(report.file_size / 1024)} KB` : ''}
                    </p>
                  </div>
                  <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => download(report)}>
                    <FaDownload aria-hidden="true" /> Open
                  </button>
                  {canReplaceReport && (
                    <button
                      type="button"
                      className="btn-outline px-3 py-1.5 text-xs"
                      onClick={() => setUploadMode('replace')}
                    >
                      <FaSyncAlt aria-hidden="true" /> Replace PDF
                    </button>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">
                  No report uploaded yet.
                </p>
              )}
            </section>

            {booking.staff_notes && (
              <section>
                <SectionTitle>Notes</SectionTitle>
                <p className="rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700">
                  {booking.staff_notes}
                </p>
              </section>
            )}
          </div>

          {/* ---- timeline ---- */}
          <aside className="min-w-0">
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <SectionTitle
                right={
                  activity.length > 0 && (
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-primary-600 hover:text-primary-700"
                      onClick={() => setShowLog((v) => !v)}
                    >
                      {showLog ? 'Hide log' : 'Full log'}
                    </button>
                  )
                }
              >
                Progress
              </SectionTitle>

              {busy ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : (
                <Timeline booking={booking} activity={activity} />
              )}

              {showLog && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                    Activity log
                  </p>
                  <ol className="space-y-2.5">
                    {activity.map((a) => (
                      <li key={a.id} className="text-xs">
                        <p className="text-gray-700">
                          {a.action === 'created'
                            ? 'Booking created'
                            : `${STATUS_LABELS[a.from_status] || a.from_status || 'start'} → ${
                                STATUS_LABELS[a.to_status] || a.to_status
                              }`}
                        </p>
                        <p className="text-gray-400">
                          {new Date(a.created_at).toLocaleString()}
                          {a.actor_role ? ` · ${a.actor_role.replace('_', ' ')}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </aside>
        </div>

        <button type="button" className="btn-outline w-full" onClick={onClose}>
          Close
        </button>
      </div>

      <UploadReportModal
        booking={uploadMode ? booking : null}
        replacing={uploadMode === 'replace' ? report : null}
        onClose={() => setUploadMode(null)}
        onUpload={async (file, notes) => {
          setError('');
          try {
            if (uploadMode === 'replace' && report) {
              await labReportService.replaceFile(report, file);
            } else {
              await labReportService.upload({
                labId: booking.lab_id || labId,
                booking,
                file,
                uploadedBy: user?.id,
                notes,
              });
              await labBookingService.update(booking.id, { workflow_status: 'report_uploaded' });
            }
            setUploadMode(null);
            await refresh();
            await onChanged?.();
          } catch (err) {
            setError(err?.message || 'Could not save that report.');
          }
        }}
      />

      <PaymentModal
        booking={paymentOpen ? booking : null}
        onClose={() => setPaymentOpen(false)}
        onSave={async (values) => {
          setError('');
          try {
            await labBookingService.recordPayment(booking.id, values);
            setPaymentOpen(false);
            await onChanged?.();
            onClose?.();
          } catch (err) {
            setError(err?.message || 'Could not record that payment.');
          }
        }}
      />

      {buildOpen && (
        <ReportBuilder
          booking={booking}
          onClose={() => setBuildOpen(false)}
          onSaved={async () => { await refresh(); await onChanged?.(); }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Delete this booking?"
        message="The booking, its activity trail and any report attached to it are removed for good. This cannot be undone."
        detail={`${booking.booking_ref || booking.id.slice(0, 8)} · ${booking.patient_name || 'Walk-in patient'}`}
        confirmLabel="Delete booking"
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await labBookingService.remove(booking.id);
          setConfirmDelete(false);
          await onChanged?.();
          onClose?.();
        }}
      />
    </Modal>
  );
}
