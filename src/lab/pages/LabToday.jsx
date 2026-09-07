import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPlus, FaEye, FaCalendarDay, FaMoneyBillWave, FaVials, FaCheckDouble } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Spinner from '../../components/common/Spinner.jsx';
import BookingDetails from '../components/BookingDetails.jsx';
import CreateBookingModal from '../components/CreateBookingModal.jsx';
import { NextStepButton } from '../components/nextStep.jsx';
import { labReportService } from '../../services/labReportService.js';
import { testCatalogService } from '../../services/testCatalogService.js';
import { labBookingService, todayISO } from '../../services/labBookingService.js';
import { formatCurrency } from '../../utils/helpers.js';
import { ROLES } from '../../config/platform.js';
import {
  Page, PageHeader, StatusPill, PaymentPill, TableFrame, Td, Row, PatientCell,
  Progress, itemsLabel, Stat, StatGrid, Alert,
} from '../components/ui.jsx';

/**
 * TODAY — the whole lab's day on one board.
 *
 * Deliberately narrow: only bookings scheduled for today, for every role at
 * the lab. It answers "what is happening right now" without anyone filtering
 * a long list, and it is where the counter starts a walk-in, so the busiest
 * screen is also the shortest path to a new booking.
 *
 * Each row carries the one action that role owns at that stage (start testing,
 * upload the report, take payment) so the day can be run from here; anything
 * needing a file or an amount opens the booking details with that dialog
 * already showing. Nobody is offered a step the database would refuse.
 */
export default function LabToday() {
  const { labId, role, user, lab } = useAuth();
  useDocumentTitle('Today');

  const [rows, setRows] = useState([]);
  const [tests, setTests] = useState([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsFor, setDetailsFor] = useState(null);
  const [detailsAction, setDetailsAction] = useState(null);
  const [reports, setReports] = useState([]);

  const today = todayISO();

  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    try {
      const [bookings, reportRows] = await Promise.all([
        labBookingService.listForLab(labId, { date: today }),
        labReportService.listForLab(labId).catch(() => []),
      ]);
      setRows(bookings);
      setReports(reportRows);
    } catch (err) {
      setError(err?.message || 'Could not load today’s bookings.');
    } finally {
      setLoading(false);
    }
  }, [labId, today]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    testCatalogService
      .listForLab(labId)
      .then(setTests)
      .catch(() => setTests([]))
      .finally(() => setTestsLoading(false));
  }, [labId]);

  const stats = useMemo(() => {
    const s = { total: rows.length, unpaid: 0, testing: 0, done: 0, revenue: 0 };
    rows.forEach((r) => {
      if (!['paid', 'waived'].includes(r.payment_status)) s.unpaid += 1;
      if (['sent_for_testing', 'testing_in_progress'].includes(r.workflow_status)) s.testing += 1;
      if (r.workflow_status === 'completed') s.done += 1;
      s.revenue += Number(r.amount_paid || 0);
    });
    return s;
  }, [rows]);

  // Only the counter roles may create a booking; the RLS insert policy agrees.
  const canBook = role === ROLES.LAB_ADMIN || role === ROLES.RECEPTIONIST;

  if (loading) return <Spinner full />;

  return (
    <Page>
      <PageHeader
        title="Today"
        subtitle={`${new Date().toLocaleDateString(undefined, {
          weekday: 'long', day: 'numeric', month: 'long',
        })} at ${lab?.name || 'your lab'}`}
      >
        {canBook && (
          <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)}>
            <FaPlus aria-hidden="true" /> New booking
          </button>
        )}
      </PageHeader>

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <StatGrid>
        <Stat label="Booked today" value={stats.total} icon={<FaCalendarDay />} />
        <Stat label="Awaiting payment" value={stats.unpaid} tone="amber" icon={<FaMoneyBillWave />} />
        <Stat label="In testing" value={stats.testing} tone="indigo" icon={<FaVials />} />
        <Stat
          label="Completed"
          value={stats.done}
          tone="emerald"
          icon={<FaCheckDouble />}
          hint={`${formatCurrency(stats.revenue)} collected`}
        />
      </StatGrid>

      <TableFrame
        head={['Patient', 'Tests', 'Time', 'Amount', 'Payment', 'Stage', 'Progress', { label: '', align: 'right' }]}
        empty={!rows.length}
        emptyIcon="📅"
        emptyText={
          canBook
            ? 'Nothing booked for today yet — start one with New booking.'
            : 'Nothing booked for today yet.'
        }
      >
        {rows.map((b) => (
          <Row key={b.id}>
            <Td><PatientCell booking={b} /></Td>
            <Td className="max-w-[220px] truncate text-gray-600">{itemsLabel(b.items)}</Td>
            <Td className="whitespace-nowrap text-gray-600">{b.scheduled_time || '—'}</Td>
            <Td className="whitespace-nowrap font-semibold text-gray-900">{formatCurrency(b.total_amount)}</Td>
            <Td><PaymentPill status={b.payment_status} /></Td>
            <Td><StatusPill status={b.workflow_status} /></Td>
            <Td><Progress status={b.workflow_status} /></Td>
            <Td className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  className="btn-soft whitespace-nowrap px-3 py-1.5 text-xs"
                  onClick={() => { setDetailsAction(null); setDetailsFor(b); }}
                >
                  <FaEye aria-hidden="true" /> Details
                </button>
                <NextStepButton
                  booking={b}
                  role={role}
                  report={reports.find((r) => r.booking_id === b.id)}
                  userId={user?.id}
                  onDone={load}
                  onNeedsDialog={(bk, kind) => { setDetailsAction(kind); setDetailsFor(bk); }}
                />
              </div>
            </Td>
          </Row>
        ))}
      </TableFrame>

      <BookingDetails
        booking={detailsFor}
        initialAction={detailsAction}
        onClose={() => { setDetailsFor(null); setDetailsAction(null); }}
        onChanged={load}
      />

      <CreateBookingModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        labId={labId}
        tests={tests}
        testsLoading={testsLoading}
        onCreate={async (payload) => {
          setError('');
          try {
            await labBookingService.create(labId, { ...payload, createdBy: user?.id });
            setCreateOpen(false);
            await load();
          } catch (err) {
            setError(err?.message || 'Could not create that booking.');
          }
        }}
      />
    </Page>
  );
}
