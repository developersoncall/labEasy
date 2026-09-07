import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaClipboardList, FaVials, FaFileMedical, FaCheckDouble, FaArrowRight } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Spinner from '../../components/common/Spinner.jsx';
import {
  labBookingService, todayISO, countPhases, WORKFLOW_STAGES, STATUS_LABELS, STATUS_STYLES,
} from '../../services/labBookingService.js';
import { ROLES, canAccessLabSection } from '../../config/platform.js';
import {
  Page, PageHeader, Section, Card, Stat, StatGrid, StatusPill, TableFrame, Td, Row,
  PatientCell, Progress, itemsLabel,
} from '../components/ui.jsx';

/**
 * The lab's day at a glance, plus "your tasks" — the bookings sitting at this
 * person's stage right now. Every role lands here; what the task list contains
 * is what that role is responsible for.
 *
 * The four tiles are folded from PIPELINE_PHASES, which covers every stage, so
 * a booking can never be counted in the total yet missing from all the tiles.
 * The pipeline strip underneath then breaks the same numbers out stage by
 * stage — that is where a Lab Admin looks to answer "where is it, exactly?".
 */

/** Which stages are waiting on which role. */
const IN_FLIGHT = WORKFLOW_STAGES.filter((s) => s !== 'completed');

const TASK_STAGES = {
  [ROLES.RECEPTIONIST]: ['booked', 'payment_pending', 'payment_completed'],
  [ROLES.TESTER]: ['sent_for_testing', 'testing_in_progress'],
  [ROLES.REPORTIST]: ['testing_completed', 'report_pending', 'report_uploaded'],
  // The Lab Admin owns the whole lab, so everything still moving is their task.
  [ROLES.LAB_ADMIN]: IN_FLIGHT,
};

const TASK_LINK = {
  [ROLES.RECEPTIONIST]: '/lab/bookings',
  [ROLES.TESTER]: '/lab/testing',
  [ROLES.REPORTIST]: '/lab/reports',
  [ROLES.LAB_ADMIN]: '/lab/bookings',
};

const TILES = [
  { key: 'awaiting_payment', label: 'Awaiting payment', hint: 'Booked or payment pending', tone: 'amber', icon: <FaClipboardList />, to: '/lab/bookings', section: 'bookings' },
  { key: 'in_testing', label: 'Paid / in testing', hint: 'Paid, queued or on the bench', tone: 'indigo', icon: <FaVials />, to: '/lab/testing', section: 'testing' },
  { key: 'reports_due', label: 'Reports due', hint: 'Testing done, report not closed', tone: 'primary', icon: <FaFileMedical />, to: '/lab/reports', section: 'reports' },
  { key: 'completed', label: 'Completed', hint: 'Closed and delivered', tone: 'emerald', icon: <FaCheckDouble />, to: '/lab/reports', section: 'reports' },
];

export default function LabDashboard() {
  const { labId, role, lab } = useAuth();
  useDocumentTitle('Lab Dashboard');

  const [counts, setCounts] = useState({});
  const [todayCounts, setTodayCounts] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    try {
      const stages = TASK_STAGES[role] || [];
      const [all, today, mine] = await Promise.all([
        labBookingService.stageCounts(labId),
        labBookingService.stageCounts(labId, todayISO()),
        stages.length
          ? labBookingService.listForLab(labId, { statuses: stages, limit: 15 })
          : Promise.resolve([]),
      ]);
      setCounts(all);
      setTodayCounts(today);
      setTasks(mine);
    } finally {
      setLoading(false);
    }
  }, [labId, role]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner full />;

  const phases = countPhases(counts);
  const todayTotal = todayCounts.total || 0;
  const total = counts.total || 0;

  // Stages that actually have something in them, in pipeline order.
  const stageRows = [...WORKFLOW_STAGES, 'cancelled']
    .map((s) => ({ stage: s, n: counts[s] || 0 }))
    .filter((r) => r.n > 0);

  return (
    <Page>
      <PageHeader
        title={lab?.name || 'Your laboratory'}
        subtitle={`${todayTotal} booking${todayTotal === 1 ? '' : 's'} scheduled for today · ${total} in total`}
      >
        <Link to="/lab/bookings" className="btn-outline px-4 py-2 text-sm">
          View all bookings
        </Link>
      </PageHeader>

      <StatGrid>
        {TILES.map((t) => (
          <Stat
            key={t.key}
            label={t.label}
            value={phases[t.key] || 0}
            hint={t.hint}
            tone={t.tone}
            icon={t.icon}
            to={canAccessLabSection(role, t.section) ? t.to : undefined}
          />
        ))}
      </StatGrid>

      {/* Where every booking actually is — the answer to "nothing is moving?" */}
      {total > 0 && (
        <Section title="Pipeline" description="Every booking in this lab, by the stage it is sitting at.">
          <Card className="p-5">
            <ul className="flex flex-wrap gap-2">
              {stageRows.map(({ stage, n }) => (
                <li
                  key={stage}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2"
                >
                  <span className={`badge ${STATUS_STYLES[stage] || 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABELS[stage] || stage}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-gray-900">{n}</span>
                </li>
              ))}
              {phases.other > 0 && (
                <li className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-amber-800">Unclassified</span>
                  <span className="font-bold tabular-nums text-amber-900">{phases.other}</span>
                </li>
              )}
            </ul>
          </Card>
        </Section>
      )}

      <Section
        title={role === ROLES.LAB_ADMIN ? 'Open bookings' : 'Your tasks'}
        description={
          role === ROLES.LAB_ADMIN
            ? 'Everything still moving through the lab, whoever it is with.'
            : 'Bookings waiting on you right now.'
        }
        action={
          TASK_LINK[role] ? (
            <Link
              to={TASK_LINK[role]}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 transition hover:text-primary-700"
            >
              Open queue <FaArrowRight className="text-xs" aria-hidden="true" />
            </Link>
          ) : null
        }
      >
        <TableFrame
          head={['Patient', 'Tests', 'Scheduled', 'Stage', 'Progress']}
          empty={!tasks.length}
          emptyIcon="✅"
          emptyText={
            total > 0
              ? 'Nothing open — every booking is completed or cancelled.'
              : 'No bookings yet. Reception creates the first one.'
          }
        >
          {tasks.map((b) => (
            <Row key={b.id}>
              <Td><PatientCell booking={b} /></Td>
              <Td className="max-w-[260px] truncate text-gray-600">{itemsLabel(b.items)}</Td>
              <Td className="whitespace-nowrap text-gray-600">
                {b.scheduled_date}
                {b.scheduled_time ? <span className="text-gray-400"> · {b.scheduled_time}</span> : null}
              </Td>
              <Td><StatusPill status={b.workflow_status} /></Td>
              <Td><Progress status={b.workflow_status} /></Td>
            </Row>
          ))}
        </TableFrame>
      </Section>
    </Page>
  );
}
