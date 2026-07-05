import { useMemo, useState } from 'react';
import { FaFlask, FaHome, FaHospital, FaCheck, FaExclamationCircle, FaMapMarkerAlt, FaDownload } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Modal from '../../components/common/Modal.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { diagnosticService } from '../../services/diagnosticService.js';
import { storageService } from '../../services/storageService.js';
import { formatCurrency, formatDate } from '../../utils/helpers.js';
import { BOOKING_STATUS, STATUS_LABELS } from '../../constants/index.js';

const TIMELINE_STEPS = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.SAMPLE_COLLECTED,
  BOOKING_STATUS.PROCESSING,
  BOOKING_STATUS.REPORT_READY,
  BOOKING_STATUS.COMPLETED,
];

/** Simple horizontal progress strip for a lab booking's lifecycle. */
function StatusTimeline({ status }) {
  const currentIndex = TIMELINE_STEPS.indexOf(status);
  return (
    <ol className="flex items-center gap-0" aria-label="Booking progress">
      {TIMELINE_STEPS.map((step, i) => {
        const reached = currentIndex >= i;
        const isCurrent = currentIndex === i;
        return (
          <li key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                  reached ? 'bg-secondary-500 text-white' : 'bg-gray-200 text-gray-400'
                } ${isCurrent ? 'ring-4 ring-secondary-100' : ''}`}
                aria-hidden="true"
              >
                {reached ? <FaCheck size={8} /> : i + 1}
              </span>
              <span
                className={`hidden whitespace-nowrap text-[10px] font-medium sm:block ${
                  isCurrent ? 'text-secondary-700' : reached ? 'text-gray-500' : 'text-gray-300'
                }`}
              >
                {STATUS_LABELS[step]}
              </span>
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <span
                className={`mx-1 mb-4 h-0.5 flex-1 rounded sm:mb-0 ${
                  currentIndex > i ? 'bg-secondary-400' : 'bg-gray-200'
                }`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The user's diagnostic test / package bookings with cancel support. */
export default function DiagnosticBookings() {
  useDocumentTitle('Lab Bookings');
  const { user } = useAuth();

  const [cancelTarget, setCancelTarget] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data: bookings, loading, refetch } = useFetch(
    () => diagnosticService.getMyBookings(user.id),
    [user.id],
  );

  // Uploaded reports — used to reveal a Download button on the matching booking.
  const { data: reports } = useFetch(() => diagnosticService.getMyReports(user.id), [user.id]);
  const reportByBooking = useMemo(() => {
    const map = {};
    (reports || []).forEach((r) => {
      if (r.booking_id && r.report_url) map[r.booking_id] = r;
    });
    return map;
  }, [reports]);

  // Reports are private — mint a short-lived signed URL on click.
  const openReport = async (report) => {
    try {
      const url = await storageService.reportUrl(report.report_url);
      if (url) window.open(url, '_blank', 'noopener');
    } catch {
      /* link simply won't open */
    }
  };

  const sorted = [...(bookings || [])].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );

  const confirmCancel = async () => {
    setActionBusy(true);
    setActionError('');
    try {
      await diagnosticService.cancelBooking(cancelTarget.id, user.id);
      setCancelTarget(null);
      await refetch();
    } catch (err) {
      setActionError(err?.message || 'Could not cancel this booking. Please try again.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lab Bookings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your diagnostic tests and health packages from sample to report.
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={FaFlask}
          title="No lab bookings yet"
          message="Book a diagnostic test or health package and follow its progress right here."
          actionLabel="Browse Lab Tests"
          actionTo="/diagnostic-tests"
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((b) => {
            const items = b.items || [];
            const isHome = b.collection_type === 'home';
            const cancellable =
              b.status === BOOKING_STATUS.PENDING || b.status === BOOKING_STATUS.CONFIRMED;
            return (
              <article key={b.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
                      {isHome ? <FaHome size={18} aria-hidden="true" /> : <FaHospital size={18} aria-hidden="true" />}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {isHome ? 'Home Sample Collection' : 'Lab Visit'}
                        {b.booking_ref && (
                          <span className="ml-2 font-mono text-xs font-semibold text-primary-600">{b.booking_ref}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(b.scheduled_date)} · {b.scheduled_time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-gray-900">{formatCurrency(b.total_amount)}</p>
                    <StatusBadge status={b.status} />
                  </div>
                </div>

                {/* Items */}
                <ul className="mt-4 flex flex-wrap gap-2" aria-label="Booked items">
                  {items.map((item, idx) => (
                    <li
                      key={`${item.id}-${item.type}-${idx}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-700"
                    >
                      {item.name}
                      <span
                        className={`badge ${
                          item.type === 'package'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-primary-50 text-primary-700'
                        }`}
                      >
                        {item.type === 'package' ? 'Package' : 'Test'}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Collection address for home visits */}
                {isHome && b.address && (
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
                    <FaMapMarkerAlt className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
                    {b.address}
                    {b.city ? `, ${b.city}` : ''}
                    {b.pincode ? ` — ${b.pincode}` : ''}
                  </p>
                )}

                {/* Progress timeline (not shown for cancelled bookings) */}
                {b.status !== BOOKING_STATUS.CANCELLED && (
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <StatusTimeline status={b.status} />
                  </div>
                )}

                {/* Report: download once admin uploads it, otherwise live status */}
                {b.status !== BOOKING_STATUS.CANCELLED && (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
                    {reportByBooking[b.id] ? (
                      <>
                        <span className="flex items-center gap-2 text-sm font-medium text-secondary-700">
                          <FaCheck aria-hidden="true" /> Report ready
                        </span>
                        <button
                          type="button"
                          onClick={() => openReport(reportByBooking[b.id])}
                          className="btn-primary text-xs"
                        >
                          <FaDownload aria-hidden="true" /> Download Report
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {b.status === BOOKING_STATUS.REPORT_READY
                          ? 'Your report is being finalised — download will appear here shortly.'
                          : `Report will be available here once your booking is complete. Current status: `}
                        {b.status !== BOOKING_STATUS.REPORT_READY && (
                          <span className="font-semibold text-gray-700">{STATUS_LABELS[b.status]}</span>
                        )}
                      </span>
                    )}
                  </div>
                )}

                {cancellable && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError('');
                        setCancelTarget(b);
                      }}
                      className="btn-ghost text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Cancel confirmation modal */}
      <Modal
        open={!!cancelTarget}
        onClose={() => !actionBusy && setCancelTarget(null)}
        title="Cancel lab booking?"
      >
        {cancelTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Your booking of {(cancelTarget.items || []).length}{' '}
              {(cancelTarget.items || []).length === 1 ? 'item' : 'items'} scheduled for{' '}
              {formatDate(cancelTarget.scheduled_date)} at {cancelTarget.scheduled_time} will be
              cancelled. Refund (if paid) arrives in 3–5 working days.
            </p>
            {actionError && (
              <p className="flex items-center gap-2 text-sm text-red-600" role="alert">
                <FaExclamationCircle aria-hidden="true" /> {actionError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCancelTarget(null)}
                disabled={actionBusy}
              >
                Keep Booking
              </button>
              <button
                type="button"
                className="btn bg-red-600 text-white shadow-sm hover:bg-red-700"
                onClick={confirmCancel}
                disabled={actionBusy}
              >
                {actionBusy ? (
                  <>
                    <Spinner size="sm" /> Cancelling…
                  </>
                ) : (
                  'Yes, Cancel It'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
