import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaUpload, FaCheckDouble, FaDownload, FaFilePdf, FaEye, FaSyncAlt, FaClipboardList,
} from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Spinner from '../../components/common/Spinner.jsx';
import BookingDetails from '../components/BookingDetails.jsx';
import UploadReportModal from '../components/UploadReportModal.jsx';
import ReportBuilder from '../components/ReportBuilder.jsx';
import { labBookingService } from '../../services/labBookingService.js';
import { labReportService } from '../../services/labReportService.js';
import {
  Page, PageHeader, StatusPill, TableFrame, Td, Row, PatientCell, itemsLabel, FilterTabs, Alert,
} from '../components/ui.jsx';

/**
 * The reportist's desk.
 *
 * A booking arrives here the moment testing is marked complete. Upload the PDF
 * (stored privately under this lab's own storage prefix), then close the
 * booking. Reports for other labs are unreachable — both the storage policy
 * and the table policy check the caller's lab.
 */

const TABS = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'due', label: 'Awaiting report', statuses: ['testing_completed', 'report_pending'] },
  { key: 'uploaded', label: 'Uploaded', statuses: ['report_uploaded'] },
  { key: 'closed', label: 'Completed', statuses: ['completed'] },
];

/** A report can only be attached once testing is finished. */
const CAN_UPLOAD = ['testing_completed', 'report_pending', 'report_uploaded', 'completed'];

const EMPTY_TEXT = {
  all: 'This laboratory has no bookings yet.',
  due: 'No reports due. All caught up.',
  uploaded: 'Nothing uploaded and waiting to be closed.',
  closed: 'No bookings have been completed yet.',
};

export default function LabReports() {
  const { labId, user } = useAuth();
  useDocumentTitle('Reports');

  const [tab, setTab] = useState('all');
  const [allRows, setAllRows] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadFor, setUploadFor] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [detailsFor, setDetailsFor] = useState(null);
  // A wrong PDF should be fixable from the desk it was noticed at.
  const [replaceFor, setReplaceFor] = useState(null);
  const [buildFor, setBuildFor] = useState(null);

  // One fetch of the lab's whole book; the tabs are slices of it, so each can
  // show its own count and switching between them costs nothing.
  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    try {
      const [bookings, reportRows] = await Promise.all([
        labBookingService.listForLab(labId, { limit: 500 }),
        labReportService.listForLab(labId),
      ]);
      setAllRows(bookings);
      setReports(reportRows);
    } catch (err) {
      setError(err?.message || 'Could not load reports.');
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

  const reportFor = (bookingId) => reports.find((r) => r.booking_id === bookingId);

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

  const download = async (report) => {
    try {
      const url = await labReportService.downloadUrl(report.file_path || report.report_url);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (err) {
      setError(err?.message || 'Could not open that report.');
    }
  };

  if (loading) return <Spinner full />;

  return (
    <Page>
      <PageHeader
        title="Reports"
        subtitle="Every booking in this lab, and the report attached to it."
      />

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <FilterTabs
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: counts[t.key] || 0 }))}
        active={tab}
        onChange={setTab}
      />

      <TableFrame
        head={['Patient', 'Tests', 'Tested on', 'Stage', 'Report', { label: '', align: 'right' }]}
        empty={!rows.length}
        emptyIcon={tab === 'due' ? '📄' : '📁'}
        emptyText={EMPTY_TEXT[tab] || 'Nothing in this view.'}
      >
        {rows.map((b) => {
          const report = reportFor(b.id);
          return (
            <Row key={b.id}>
              <Td><PatientCell booking={b} /></Td>
              <Td className="max-w-[220px] truncate text-gray-600">{itemsLabel(b.items)}</Td>
              <Td className="whitespace-nowrap text-gray-600">
                {b.testing_completed_at ? new Date(b.testing_completed_at).toLocaleDateString() : '—'}
              </Td>
              <Td><StatusPill status={b.workflow_status} /></Td>
              <Td>
                {report ? (
                  <button
                    type="button"
                    onClick={() => download(report)}
                    className="inline-flex max-w-[180px] items-center gap-1.5 text-sm font-medium text-primary-600 transition hover:text-primary-700"
                  >
                    <FaFilePdf className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{report.file_name || report.report_ref}</span>
                    <FaDownload className="shrink-0 text-xs" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="text-sm text-gray-400">Not uploaded</span>
                )}
              </Td>
              <Td className="text-right">
                <button
                  type="button"
                  className="btn-ghost mr-1 whitespace-nowrap px-3 py-1.5 text-xs"
                  onClick={() => setDetailsFor(b)}
                >
                  <FaEye aria-hidden="true" /> Details
                </button>
                {CAN_UPLOAD.includes(b.workflow_status) && (
                  <button
                    type="button"
                    className="btn-outline mr-1 whitespace-nowrap px-3 py-1.5 text-xs"
                    onClick={() => setBuildFor(b)}
                  >
                    <FaClipboardList aria-hidden="true" /> Create report
                  </button>
                )}
                {!report && CAN_UPLOAD.includes(b.workflow_status) && (
                  <button
                    type="button"
                    className="btn-primary whitespace-nowrap px-3.5 py-1.5 text-xs"
                    onClick={() => setUploadFor(b)}
                  >
                    <FaUpload aria-hidden="true" /> Upload report
                  </button>
                )}
                {!report && !CAN_UPLOAD.includes(b.workflow_status) && (
                  <span className="whitespace-nowrap text-xs text-gray-400">
                    {b.workflow_status === 'cancelled' ? 'cancelled' : 'waiting on testing'}
                  </span>
                )}
                {report && (
                  <button
                    type="button"
                    className="btn-outline whitespace-nowrap px-3 py-1.5 text-xs"
                    onClick={() => setReplaceFor({ booking: b, report })}
                  >
                    <FaSyncAlt aria-hidden="true" /> Replace
                  </button>
                )}
                {report && b.workflow_status !== 'completed' && (
                  <button
                    type="button"
                    className="btn-secondary whitespace-nowrap px-3.5 py-1.5 text-xs"
                    disabled={busyId === b.id}
                    onClick={() =>
                      act(b.id, async () => {
                        await labReportService.markCompleted(report.id);
                        await labBookingService.markCompleted(b.id);
                      })
                    }
                  >
                    <FaCheckDouble aria-hidden="true" /> Mark completed
                  </button>
                )}
              </Td>
            </Row>
          );
        })}
      </TableFrame>

      <BookingDetails booking={detailsFor} onClose={() => setDetailsFor(null)} onChanged={load} />

      <ReportBuilder booking={buildFor} onClose={() => setBuildFor(null)} onSaved={load} />

      <UploadReportModal
        booking={replaceFor?.booking || null}
        replacing={replaceFor?.report || null}
        onClose={() => setReplaceFor(null)}
        onUpload={async (file) => {
          await act(replaceFor.booking.id, async () => {
            await labReportService.replaceFile(replaceFor.report, file);
            setReplaceFor(null);
          });
        }}
      />

      <UploadReportModal
        booking={uploadFor}
        onClose={() => setUploadFor(null)}
        onUpload={async (file, notes) => {
          await act(uploadFor.id, async () => {
            await labReportService.upload({
              labId,
              booking: uploadFor,
              file,
              uploadedBy: user?.id,
              notes,
            });
            await labBookingService.update(uploadFor.id, { workflow_status: 'report_uploaded' });
          });
          setUploadFor(null);
        }}
      />
    </Page>
  );
}
