import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPlus, FaMoneyBillWave, FaPaperPlane, FaEye, FaTrash } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Spinner from '../../components/common/Spinner.jsx';
import CreateBookingModal from '../components/CreateBookingModal.jsx';
import PaymentModal from '../components/PaymentModal.jsx';
import BookingDetails from '../components/BookingDetails.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { testCatalogService } from '../../services/testCatalogService.js';
import { labBookingService, todayISO, STATUS_LABELS } from '../../services/labBookingService.js';
import { formatCurrency } from '../../utils/helpers.js';
import { ROLES } from '../../config/platform.js';
import {
  Page, PageHeader, StatusPill, PaymentPill, TableFrame, Td, Row, PatientCell,
  Progress, itemsLabel, FilterTabs, SearchBox, Alert,
} from '../components/ui.jsx';

/**
 * Reception: create bookings, take payment, hand them to testing.
 *
 * This is the front of the pipeline. A booking created here belongs to this
 * lab (the database stamps lab_id from the caller's profile and refuses any
 * other), and the only stage buttons rendered are the ones a receptionist is
 * allowed to press — the same list the workflow trigger enforces.
 *
 * Payment gates testing: a booking cannot be sent to the bench until it is
 * paid. The button below is hidden until then, and the database raises an
 * error if anything tries the transition anyway.
 */

/** Payment is settled — 'waived' covers labs that bill separately. */
const paymentSettled = (b) => ['paid', 'waived'].includes(b.payment_status);

// 'Open' means everything still moving through the pipeline — including the
// stages the tester and reportist own. Listing only the first few stages made
// a booking disappear from this screen the moment testing started.
const IN_FLIGHT = [
  'booked', 'payment_pending', 'payment_completed', 'sent_for_testing',
  'testing_in_progress', 'testing_completed', 'report_pending', 'report_uploaded',
];

// 'All' leads and is the default: the lab should open this screen and see
// every booking it has, not a filtered subset it has to go looking for.
const FILTERS = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'active', label: 'Open', statuses: IN_FLIGHT },
  { key: 'today', label: 'Today', statuses: null },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

/** Per-tab totals so nothing is hidden behind a filter without a hint. */
function tabCounts(counts) {
  const sum = (keys) => keys.reduce((n, k) => n + (counts[k] || 0), 0);
  return {
    active: sum(IN_FLIGHT),
    all: counts.total || 0,
    completed: counts.completed || 0,
    cancelled: counts.cancelled || 0,
  };
}

export default function LabBookings() {
  const { labId, role, user } = useAuth();
  useDocumentTitle('Bookings');

  const [rows, setRows] = useState([]);
  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({});

  const [createOpen, setCreateOpen] = useState(false);
  const [payFor, setPayFor] = useState(null);
  const [detailsFor, setDetailsFor] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);

  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    try {
      const f = FILTERS.find((x) => x.key === filter);
      const [list, stages] = await Promise.all([
        labBookingService.listForLab(labId, {
          statuses: f?.statuses || undefined,
          date: filter === 'today' ? todayISO() : undefined,
        }),
        labBookingService.stageCounts(labId),
      ]);
      setRows(list);
      setCounts(stages);
    } catch (err) {
      setError(err?.message || 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, [labId, filter]);

  useEffect(() => { load(); }, [load]);

  // The catalogue is maintained by the platform admin; the lab only reads it.
  useEffect(() => {
    if (!labId) return;
    setTestsLoading(true);
    testCatalogService
      .listForLab(labId)
      .then(setTests)
      .catch(() => setTests([]))
      .finally(() => setTestsLoading(false));
  }, [labId]);

  const visible = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (r.patient_name || '').toLowerCase().includes(s) ||
        (r.booking_ref || '').toLowerCase().includes(s) ||
        (r.patient_phone || '').includes(s),
    );
  }, [rows, search]);

  const act = async (fn) => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err?.message || 'That action was refused.');
    }
  };

  const canBook = role === ROLES.RECEPTIONIST || role === ROLES.LAB_ADMIN;

  if (loading) return <Spinner full />;

  return (
    <Page>
      <PageHeader
        title="Bookings"
        subtitle="Create bookings, record payment and send samples for testing."
      >
        {canBook && (
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            <FaPlus aria-hidden="true" /> New booking
          </button>
        )}
      </PageHeader>

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <FilterTabs
        tabs={FILTERS.map((f) => ({ key: f.key, label: f.label, count: tabCounts(counts)[f.key] || 0 }))}
        active={filter}
        onChange={setFilter}
      >
        <SearchBox value={search} onChange={setSearch} placeholder="Name, phone or BK ref" />
      </FilterTabs>

      <TableFrame
        head={['Patient', 'Tests', 'Scheduled', 'Amount', 'Payment', 'Stage', 'Progress', { label: '', align: 'right' }]}
        empty={!visible.length}
        emptyIcon="🗂️"
        emptyText={
          filter === 'active' && (counts.completed || counts.cancelled)
            ? 'Nothing open right now — finished bookings are under Completed.'
            : 'No bookings in this view.'
        }
      >
        {visible.map((b) => (
          <Row key={b.id}>
            <Td><PatientCell booking={b} /></Td>
            <Td className="max-w-[220px] truncate text-gray-600">{itemsLabel(b.items)}</Td>
            <Td className="whitespace-nowrap text-gray-600">
              {b.scheduled_date}
              {b.scheduled_time ? <span className="text-gray-400"> · {b.scheduled_time}</span> : null}
            </Td>
            <Td className="whitespace-nowrap font-semibold tabular-nums text-gray-900">
              {formatCurrency(b.total_amount)}
            </Td>
            <Td><PaymentPill status={b.payment_status} /></Td>
            <Td><StatusPill status={b.workflow_status} /></Td>
            <Td><Progress status={b.workflow_status} /></Td>
            <Td className="text-right">
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  className="btn-ghost whitespace-nowrap px-3 py-1.5 text-xs"
                  onClick={() => setDetailsFor(b)}
                >
                  <FaEye aria-hidden="true" /> Details
                </button>
                {b.payment_status !== 'paid' && b.workflow_status !== 'cancelled' && (
                  <button type="button" className="btn-ghost whitespace-nowrap px-3 py-1.5 text-xs" onClick={() => setPayFor(b)}>
                    <FaMoneyBillWave aria-hidden="true" /> Payment
                  </button>
                )}
                {['booked', 'payment_pending', 'payment_completed'].includes(b.workflow_status) &&
                  (paymentSettled(b) ? (
                    <button
                      type="button"
                      className="btn-primary whitespace-nowrap px-3 py-1.5 text-xs"
                      onClick={() => act(() => labBookingService.sendToTesting(b.id))}
                    >
                      <FaPaperPlane aria-hidden="true" /> Send to testing
                    </button>
                  ) : (
                    <span
                      className="whitespace-nowrap rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700"
                      title="Record the payment before this booking can go for testing"
                    >
                      Payment required first
                    </span>
                  ))}
                {role === ROLES.LAB_ADMIN && (
                  <button
                    type="button"
                    className="btn-ghost whitespace-nowrap px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                    title="Delete this booking"
                    onClick={() => setDeleteFor(b)}
                  >
                    <FaTrash aria-hidden="true" />
                  </button>
                )}
              </div>
            </Td>
          </Row>
        ))}
      </TableFrame>

      <BookingDetails booking={detailsFor} onClose={() => setDetailsFor(null)} onChanged={load} />

      <ConfirmDialog
        open={!!deleteFor}
        danger
        title="Delete this booking?"
        message="The booking, its activity trail and any report attached to it are removed for good. This cannot be undone."
        detail={deleteFor ? `${deleteFor.booking_ref || ''} · ${deleteFor.patient_name || 'Walk-in patient'}` : ''}
        confirmLabel="Delete booking"
        onClose={() => setDeleteFor(null)}
        onConfirm={async () => {
          await labBookingService.remove(deleteFor.id);
          setDeleteFor(null);
          await load();
        }}
      />

      <CreateBookingModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        tests={tests}
        testsLoading={testsLoading}
        onCreate={async (payload) => {
          await act(() => labBookingService.create(labId, { ...payload, createdBy: user?.id }));
          setCreateOpen(false);
        }}
      />

      <PaymentModal
        booking={payFor}
        onClose={() => setPayFor(null)}
        onSave={async (values) => {
          await act(() => labBookingService.recordPayment(payFor.id, values));
          setPayFor(null);
        }}
      />
    </Page>
  );
}
