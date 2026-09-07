import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPlay, FaCheck, FaFlask, FaEye, FaClipboardList } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Spinner from '../../components/common/Spinner.jsx';
import BookingDetails from '../components/BookingDetails.jsx';
import ReportBuilder from '../components/ReportBuilder.jsx';
import { labBookingService } from '../../services/labBookingService.js';
import {
  Page, PageHeader, StatusPill, TableFrame, Td, Row, PatientCell, itemsLabel, FilterTabs, Alert,
} from '../components/ui.jsx';

/**
 * The tester's bench.
 *
 * "All" is the whole lab's book, so anyone can look a booking up; the task
 * tabs next to it narrow the list to what is actually waiting on a tester.
 * Visibility is wide, ability is not: the Start/Complete buttons only appear
 * on bookings that have reached testing, which is exactly what the
 * enforce_booking_workflow trigger will accept from this role.
 */

const TABS = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'new', label: 'New tasks', statuses: ['sent_for_testing'] },
  { key: 'running', label: 'In progress', statuses: ['testing_in_progress'] },
  { key: 'done', label: 'Completed', statuses: ['testing_completed', 'report_pending', 'report_uploaded', 'completed'] },
];

/** Stages that have not reached the bench yet — shown, but not actionable here. */
const BEFORE_TESTING = ['booked', 'payment_pending', 'payment_completed'];

const EMPTY_TEXT = {
  all: 'This laboratory has no bookings yet.',
  new: 'No samples waiting. You are clear.',
  running: 'Nothing on the bench right now.',
  done: 'No completed tests yet.',
};

export default function LabTesting() {
  const { labId, user } = useAuth();
  useDocumentTitle('Testing');

  const [tab, setTab] = useState('all');
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [detailsFor, setDetailsFor] = useState(null);
  const [reportFor, setReportFor] = useState(null);

  // Fetch the lab's bookings once and slice them locally: switching tabs is
  // then instant, and every tab can carry a real count instead of only the
  // one that happens to be open.
  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    try {
      setAllRows(await labBookingService.listForLab(labId, { limit: 500 }));
    } catch (err) {
      setError(err?.message || 'Could not load the testing queue.');
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => { load(); }, [load]);

  const inTab = (t) => (t.statuses ? allRows.filter((r) => t.statuses.includes(r.workflow_status)) : allRows);
  const rows = useMemo(
    () => inTab(TABS.find((t) => t.key === tab) || TABS[0]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRows, tab],
  );
  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, inTab(t).length])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRows],
  );

  const act = async (id, fn) => {
    setError('');
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err?.message || 'That action was refused.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner full />;

  return (
    <Page>
      <PageHeader
        title="Testing"
        subtitle="Every booking in this lab, with the ones waiting on the bench a tab away."
      />

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <FilterTabs
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: counts[t.key] || 0 }))}
        active={tab}
        onChange={setTab}
      />

      <TableFrame
        head={['Patient', 'Tests', 'Scheduled', 'Stage', { label: '', align: 'right' }]}
        empty={!rows.length}
        emptyIcon={tab === 'new' ? '🧪' : '📋'}
        emptyText={EMPTY_TEXT[tab] || 'Nothing in this view.'}
      >
        {rows.map((b) => (
          <Row key={b.id}>
            <Td><PatientCell booking={b} /></Td>
            <Td className="max-w-[300px] truncate text-gray-600">{itemsLabel(b.items)}</Td>
            <Td className="whitespace-nowrap text-gray-600">
              {b.scheduled_date}
              {b.scheduled_time ? <span className="text-gray-400"> · {b.scheduled_time}</span> : null}
            </Td>
            <Td><StatusPill status={b.workflow_status} /></Td>
            <Td className="text-right">
              <button
                type="button"
                className="btn-ghost mr-1 whitespace-nowrap px-3 py-1.5 text-xs"
                onClick={() => setDetailsFor(b)}
              >
                <FaEye aria-hidden="true" /> Details
              </button>
              {b.workflow_status === 'sent_for_testing' && (
                <button
                  type="button"
                  className="btn-primary whitespace-nowrap px-3.5 py-1.5 text-xs"
                  disabled={busyId === b.id}
                  onClick={() => act(b.id, () => labBookingService.startTesting(b.id, user?.id))}
                >
                  <FaPlay aria-hidden="true" /> Start testing
                </button>
              )}
              {['testing_in_progress', 'testing_completed'].includes(b.workflow_status) && (
                <button
                  type="button"
                  className="btn-outline mr-1 whitespace-nowrap px-3 py-1.5 text-xs"
                  onClick={() => setReportFor(b)}
                >
                  <FaClipboardList aria-hidden="true" /> Create report
                </button>
              )}
              {b.workflow_status === 'testing_in_progress' && (
                <button
                  type="button"
                  className="btn-secondary whitespace-nowrap px-3.5 py-1.5 text-xs"
                  disabled={busyId === b.id}
                  onClick={() => act(b.id, () => labBookingService.completeTesting(b.id))}
                >
                  <FaCheck aria-hidden="true" /> Mark completed
                </button>
              )}
              {['testing_completed', 'report_pending', 'report_uploaded', 'completed'].includes(b.workflow_status) && (
                <span className="whitespace-nowrap text-xs text-gray-400">
                  <FaFlask className="inline" aria-hidden="true" /> handed to reporting
                </span>
              )}
              {BEFORE_TESTING.includes(b.workflow_status) && (
                <span className="whitespace-nowrap text-xs text-gray-400">still with reception</span>
              )}
              {b.workflow_status === 'cancelled' && (
                <span className="whitespace-nowrap text-xs text-gray-400">cancelled</span>
              )}
            </Td>
          </Row>
        ))}
      </TableFrame>

      <BookingDetails booking={detailsFor} onClose={() => setDetailsFor(null)} onChanged={load} />

      <ReportBuilder booking={reportFor} onClose={() => setReportFor(null)} onSaved={load} />
    </Page>
  );
}
