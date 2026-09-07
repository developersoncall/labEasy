import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaFlask, FaInfoCircle, FaArrowRight, FaArrowLeft, FaCheckCircle,
  FaFilePdf, FaDownload, FaPen,
} from 'react-icons/fa';
import Modal from '../../components/common/Modal.jsx';
import useAuth from '../../hooks/useAuth.js';
import { labTestService } from '../../services/labTestService.js';
import {
  reportResultService, flagFor, FLAG_STYLES, FLAG_LABELS,
} from '../../services/reportResultService.js';
import { labReportService } from '../../services/labReportService.js';
import { labBookingService } from '../../services/labBookingService.js';
import { buildReportPdf, groupRows } from '../report/reportPdf.js';
import { ROLES } from '../../config/platform.js';
import { labStaffService } from '../../services/labStaffService.js';
import { composeRange } from '../../config/units.js';
import UnitSelect from './UnitSelect.jsx';
import { Alert } from './ui.jsx';

/**
 * Create a report: enter the values, read the report back, approve it.
 *
 * Three steps on purpose. The middle one is a real preview of what the patient
 * will receive, because approving a document you have not read is not
 * approving anything. Only on approval is the PDF generated, stored and the
 * report row signed — so a half-finished sheet never leaves a file behind.
 *
 * Open to the tester whose bench work it is and to the Lab Admin.
 */
export default function ReportBuilder({ booking, onClose, onSaved }) {
  const { labId, lab, role, user, profile } = useAuth();

  const [step, setStep] = useState('entry'); // entry | preview | done
  const [rows, setRows] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [saved, setSaved] = useState(null); // { report, blobUrl }
  // The report is signed by the laboratory, so the signatory is its Lab Admin
  // whoever happens to be entering the values.
  const [approvedBy, setApprovedBy] = useState('');

  const items = useMemo(() => (Array.isArray(booking?.items) ? booking.items : []), [booking]);

  const load = useCallback(async () => {
    if (!booking) return;
    setLoading(true);
    setError('');
    try {
      const { values, schemaMissing: valuesMissing } = await reportResultService.listForBooking(booking.id);
      const existing = new Map(values.map((v) => [`${v.test_id || ''}::${v.parameter_name}`, v]));

      const testIds = items.map((i) => i.id).filter(Boolean);
      const { byTest, schemaMissing: paramsMissing } = await labTestService.parametersForTests(testIds);
      setSchemaMissing(valuesMissing || paramsMissing);

      const built = [];
      items.forEach((item) => {
        const params = byTest[item.id] || [];
        if (params.length) {
          params.forEach((p) => {
            const prev = existing.get(`${item.id}::${p.name}`);
            built.push({
              testId: item.id,
              testName: item.name || 'Test',
              parameterId: p.id,
              parameterName: p.name,
              unit: p.unit,
              refRange: p.refRange,
              refLow: p.refLow,
              refHigh: p.refHigh,
              groupLabel: p.groupLabel,
              value: prev?.value ?? '',
              flag: prev?.flag ?? '',
            });
          });
        } else {
          // A test with no parameters defined still gets a line, so the result
          // is recorded rather than lost for want of a template.
          const prev = existing.get(`${item.id}::${item.name}`);
          built.push({
            testId: item.id || null,
            testName: item.name || 'Test',
            parameterId: null,
            parameterName: item.name || 'Result',
            unit: '', refRange: '', refLow: null, refHigh: null, groupLabel: '',
            value: prev?.value ?? '',
            flag: prev?.flag ?? '',
          });
        }
      });
      setRows(built);
    } catch (err) {
      setError(err?.message || 'Could not prepare the result sheet.');
    } finally {
      setLoading(false);
    }
  }, [booking, items]);

  useEffect(() => {
    let alive = true;
    if (!labId) return undefined;
    labStaffService
      .listByRole(labId, ROLES.LAB_ADMIN)
      .then((admins) => {
        if (!alive) return;
        setApprovedBy(admins[0]?.full_name || admins[0]?.email || '');
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [labId]);

  const bookingId = booking?.id;
  useEffect(() => {
    setStep('entry');
    setSaved(null);
    setNotes('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  // Revoke the preview object URL when this closes, so it isn't leaked.
  useEffect(() => () => { if (saved?.blobUrl) URL.revokeObjectURL(saved.blobUrl); }, [saved]);

  const setValue = (i, value) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, value, flag: flagFor(value, r) } : r)));
  /** Patch any field on a row, re-flagging against its (possibly new) range. */
  const setRow = (i, patch) =>
    setRows((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, ...patch };
        return { ...next, flag: flagFor(next.value, next) };
      }),
    );

  /** A bound typed here also rewrites what the report will print. */
  const setBound = (i, key, v) =>
    setRows((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const next = { ...r, [key]: v === '' ? null : v };
        const kind = next.refLow != null && next.refHigh != null
          ? 'between'
          : next.refHigh != null ? 'max' : next.refLow != null ? 'min' : 'text';
        const refRange = composeRange({
          kind, low: next.refLow, high: next.refHigh, text: next.refRange,
        });
        return { ...next, refRange, flag: flagFor(next.value, next) };
      }),
    );

  /** Add a line to a test the catalogue has no parameters for. */
  const addRowTo = (group) =>
    setRows((rs) => {
      const lastIndex = rs.map((r) => r.testName).lastIndexOf(group.testName);
      const row = {
        testId: group.rows[0]?.testId ?? null,
        testName: group.testName,
        parameterId: null,
        parameterName: '',
        unit: '', refRange: '', refLow: null, refHigh: null,
        groupLabel: group.groupLabel || '',
        value: '', flag: '',
      };
      const at = lastIndex < 0 ? rs.length : lastIndex + 1;
      return [...rs.slice(0, at), row, ...rs.slice(at)];
    });

  const filled = rows.filter((r) => String(r.value).trim() !== '').length;
  const preparedBy = profile?.full_name || user?.email || 'Authorised signatory';

  /**
   * Approve: write the values, generate the PDF, attach it to the report row
   * and move the booking on — in that order, so a failure at any point leaves
   * nothing half-published.
   */
  const approve = async () => {
    setWorking(true);
    setError('');
    try {
      const { reportId } = await reportResultService.save({
        booking,
        labId,
        rows,
        enteredBy: user?.id,
        title: `${items.map((i) => i.name).filter(Boolean).join(', ') || 'Lab Report'} — ${
          booking.patient_name || booking.booking_ref
        }`,
      });

      const blob = await buildReportPdf({
        lab,
        booking,
        rows,
        preparedBy,
        approvedBy: approvedBy || lab?.name,
        notes,
      });
      const file = new File([blob], `${booking.booking_ref || 'report'}.pdf`, {
        type: 'application/pdf',
      });

      const report = await labReportService.attachFile({
        reportId,
        labId,
        booking,
        file,
        signedBy: preparedBy,
      });

      // A tester may take the booking as far as "testing completed"; the Lab
      // Admin can mark the report itself as delivered. Both match the workflow
      // trigger, so neither is refused by the database.
      const s = booking.workflow_status;
      if (role === ROLES.TESTER && ['sent_for_testing', 'testing_in_progress'].includes(s)) {
        await labBookingService.completeTesting(booking.id);
      } else if (role !== ROLES.TESTER && s !== 'completed') {
        await labBookingService.update(booking.id, { workflow_status: 'report_uploaded' });
      }

      setSaved({ report, blobUrl: URL.createObjectURL(blob) });
      setStep('done');
      await onSaved?.();
    } catch (err) {
      setError(err?.message || 'Could not generate and save the report.');
    } finally {
      setWorking(false);
    }
  };

  if (!booking) return null;

  const groups = groupRows(rows);

  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      title={
        step === 'entry'
          ? `Create report — ${booking.booking_ref || ''}`
          : step === 'preview'
            ? 'Check and approve'
            : 'Report approved'
      }
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        {/* ---- where we are ---- */}
        <ol className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em]">
          {[['entry', '1 Enter results'], ['preview', '2 Check'], ['done', '3 Approved']].map(
            ([key, label], i) => {
              const order = ['entry', 'preview', 'done'];
              const active = key === step;
              const passed = order.indexOf(key) < order.indexOf(step);
              return (
                <li key={key} className="flex items-center gap-2">
                  {i > 0 && <span className="h-px w-4 bg-gray-200" aria-hidden="true" />}
                  <span
                    className={`rounded-full px-2.5 py-1 ${
                      active
                        ? 'bg-primary-600 text-white'
                        : passed
                          ? 'bg-primary-50 text-primary-700'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            },
          )}
        </ol>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <div>
            <p className="font-semibold text-gray-900">{booking.patient_name || 'Walk-in patient'}</p>
            <p className="text-xs text-gray-500">
              {booking.patient_age ? `${booking.patient_age} yrs` : ''}
              {booking.patient_gender ? ` · ${booking.patient_gender}` : ''}
              {booking.scheduled_date ? ` · ${booking.scheduled_date}` : ''}
            </p>
          </div>
          {step === 'entry' && (
            <span className="text-xs text-gray-500">{filled} of {rows.length} filled</span>
          )}
        </div>

        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
        {schemaMissing && (
          <Alert tone="warning">
            Structured results need section 20 of newSQL.html to be run in the Supabase SQL Editor.
          </Alert>
        )}

        {/* ================= step 1: enter ================= */}
        {step === 'entry' && (
          loading ? (
            <p className="py-8 text-center text-sm text-gray-400">Preparing the sheet…</p>
          ) : !rows.length ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
              <FaFlask className="mx-auto text-xl text-gray-300" aria-hidden="true" />
              <p className="mt-2 text-sm text-gray-500">
                This booking has no tests on it, so there is nothing to record.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-5">
                {groups.map((g) => (
                  <section key={g.key}>
                    <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary-700">
                      {g.testName}
                      {g.groupLabel && <span className="text-gray-400"> · {g.groupLabel}</span>}
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Parameter</th>
                            <th className="w-32 px-3 py-2 text-left font-semibold">Result</th>
                            <th className="w-20 px-3 py-2 text-left font-semibold">Unit</th>
                            <th className="w-40 px-3 py-2 text-left font-semibold">Reference</th>
                            <th className="w-24 px-3 py-2 text-left font-semibold">Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {g.rows.map((r) => {
                            const index = rows.indexOf(r);
                            // A row the catalogue defined is fixed; an ad-hoc
                            // one is editable here, so a test booked from the
                            // shared catalogue can still carry a unit and a
                            // range — and therefore a flag.
                            const adhoc = !r.parameterId;
                            return (
                              <tr key={`${r.testId}-${r.parameterName}-${index}`} className="align-top">
                                <td className="px-2 py-1.5 text-gray-800">
                                  {adhoc ? (
                                    <input
                                      className="input-field h-9 py-1 text-sm"
                                      value={r.parameterName}
                                      onChange={(e) => setRow(index, { parameterName: e.target.value })}
                                      placeholder="Parameter name"
                                      aria-label="Parameter name"
                                    />
                                  ) : (
                                    <span className="block pt-2">{r.parameterName}</span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5">
                                  <input
                                    className="input-field h-9 py-1 text-sm"
                                    value={r.value}
                                    onChange={(e) => setValue(index, e.target.value)}
                                    placeholder="—"
                                    aria-label={`Result for ${r.parameterName}`}
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  {adhoc ? (
                                    <UnitSelect
                                      className="h-9 w-24 py-1 text-sm"
                                      value={r.unit}
                                      onChange={(v) => setRow(index, { unit: v })}
                                    />
                                  ) : (
                                    <span className="block pt-2 text-gray-500">{r.unit || '—'}</span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5">
                                  {adhoc ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        className="input-field h-9 w-16 py-1 text-sm"
                                        type="number"
                                        step="any"
                                        placeholder="low"
                                        value={r.refLow ?? ''}
                                        onChange={(e) => setBound(index, 'refLow', e.target.value)}
                                        aria-label="Reference low"
                                      />
                                      <span className="text-gray-300">–</span>
                                      <input
                                        className="input-field h-9 w-16 py-1 text-sm"
                                        type="number"
                                        step="any"
                                        placeholder="high"
                                        value={r.refHigh ?? ''}
                                        onChange={(e) => setBound(index, 'refHigh', e.target.value)}
                                        aria-label="Reference high"
                                      />
                                    </div>
                                  ) : (
                                    <span className="block pt-2 text-gray-500">{r.refRange || '—'}</span>
                                  )}
                                </td>
                                <td className="px-2 py-1.5">
                                  <span className="block pt-1.5">
                                    {r.flag ? (
                                      <span className={`badge ${FLAG_STYLES[r.flag]}`}>{FLAG_LABELS[r.flag]}</span>
                                    ) : (
                                      <span className="text-xs text-gray-300">—</span>
                                    )}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      className="mt-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
                      onClick={() => addRowTo(g)}
                    >
                      + Add a parameter to {g.testName}
                    </button>
                  </section>
                ))}
              </div>

              <div>
                <label className="form-label" htmlFor="rb-notes">Interpretation / notes</label>
                <textarea
                  id="rb-notes"
                  rows={2}
                  className="input-field"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional. Printed under the results on the report."
                />
              </div>

              <div className="flex gap-2">
                <button type="button" className="btn-outline flex-1" onClick={onClose}>Cancel</button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  onClick={() => setStep('preview')}
                  disabled={!rows.length}
                >
                  Generate report <FaArrowRight aria-hidden="true" />
                </button>
              </div>
            </>
          )
        )}

        {/* ================= step 2: preview ================= */}
        {step === 'preview' && (
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="bg-primary-600 px-6 py-4 text-white">
                <p className="text-lg font-bold">{lab?.name || 'Laboratory'}</p>
                <p className="text-[11px] opacity-90">
                  {[lab?.lab_ref, lab?.address, lab?.phone].filter(Boolean).join('  ·  ')}
                </p>
              </div>

              <div className="grid gap-3 border-b border-gray-100 px-6 py-4 text-sm sm:grid-cols-2">
                {[
                  ['Patient', booking.patient_name || 'Walk-in patient'],
                  ['Booking', booking.booking_ref || '—'],
                  ['Age / Sex', [booking.patient_age ? `${booking.patient_age} yrs` : null, booking.patient_gender].filter(Boolean).join(' / ') || '—'],
                  ['Reported', new Date().toLocaleString()],
                ].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">{l}</p>
                    <p className="text-gray-900">{v}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 px-6 py-4">
                {groups.map((g) => (
                  <section key={g.key}>
                    <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-primary-700">
                      {g.testName}
                      {g.groupLabel && <span className="text-gray-400"> — {g.groupLabel}</span>}
                    </h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-500">
                          <th className="w-[38%] py-1.5 text-left font-semibold">Investigation</th>
                          <th className="w-[13%] py-1.5 text-center font-semibold">Result</th>
                          <th className="w-[13%] py-1.5 pl-1.5 text-left font-semibold">Unit</th>
                          <th className="w-[29%] py-1.5 text-left font-semibold">Reference</th>
                          <th className="w-[7%] py-1.5 text-center font-semibold">Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.rows.map((r) => (
                          <tr key={`${r.testId}-${r.parameterName}`} className="border-b border-gray-50">
                            <td className="py-1.5 text-gray-800">{r.parameterName}</td>
                            <td className={`py-1.5 text-center font-bold tabular-nums ${
                              r.flag === 'high' || r.flag === 'abnormal'
                                ? 'text-red-600'
                                : r.flag === 'low' ? 'text-amber-600' : 'text-gray-900'
                            }`}>
                              {r.value || '—'}
                            </td>
                            <td className="py-1.5 pl-1.5 text-gray-500">{r.unit || ''}</td>
                            <td className="py-1.5 text-gray-500">{r.refRange || '—'}</td>
                            <td className={`py-1.5 text-center text-xs font-bold ${
                              r.flag === 'high' || r.flag === 'abnormal'
                                ? 'text-red-600'
                                : r.flag === 'low' ? 'text-amber-600' : 'text-gray-300'
                            }`}>
                              {r.flag === 'high' ? 'H' : r.flag === 'low' ? 'L' : r.flag === 'abnormal' ? 'A' : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                ))}

                {notes && (
                  <section>
                    <h4 className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary-700">
                      Interpretation
                    </h4>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{notes}</p>
                  </section>
                )}

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-900">{preparedBy}</p>
                  <p className="text-xs text-gray-500">Approved by</p>
                </div>
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-gray-500">
              <FaInfoCircle className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
              Approving saves these values, generates the PDF and attaches it to the booking. You can
              replace the PDF afterwards from the booking if something needs correcting.
            </p>

            <div className="flex gap-2">
              <button type="button" className="btn-outline flex-1" onClick={() => setStep('entry')} disabled={working}>
                <FaArrowLeft aria-hidden="true" /> Back to values
              </button>
              <button type="button" className="btn-primary flex-1" onClick={approve} disabled={working}>
                <FaCheckCircle aria-hidden="true" /> {working ? 'Approving…' : 'Approve & save report'}
              </button>
            </div>
          </>
        )}

        {/* ================= step 3: done ================= */}
        {step === 'done' && (
          <>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 text-center">
              <FaCheckCircle className="mx-auto text-3xl text-emerald-500" aria-hidden="true" />
              <h3 className="mt-3 text-base font-bold text-gray-900">Report approved and saved</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                The PDF is stored against booking {booking.booking_ref} and is available from the
                booking, the Reports desk and the patient&apos;s record.
              </p>
              {saved?.report?.report_ref && (
                <p className="mt-2 font-mono text-xs text-gray-500">{saved.report.report_ref}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {saved?.blobUrl && (
                <a
                  className="btn-outline flex-1"
                  href={saved.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaFilePdf aria-hidden="true" /> Open the PDF
                </a>
              )}
              {saved?.blobUrl && (
                <a
                  className="btn-ghost flex-1"
                  href={saved.blobUrl}
                  download={`${booking.booking_ref || 'report'}.pdf`}
                >
                  <FaDownload aria-hidden="true" /> Download
                </a>
              )}
              <button type="button" className="btn-ghost flex-1" onClick={() => setStep('entry')}>
                <FaPen aria-hidden="true" /> Edit values
              </button>
            </div>

            <button type="button" className="btn-primary w-full" onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </Modal>
  );
}
