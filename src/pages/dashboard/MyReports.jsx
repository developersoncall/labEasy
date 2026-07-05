import { FaFileMedical, FaDownload, FaHourglassHalf } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { diagnosticService } from '../../services/diagnosticService.js';
import { storageService } from '../../services/storageService.js';
import { formatDate } from '../../utils/helpers.js';

/** Downloadable list of the user's medical / lab reports. */
export default function MyReports() {
  useDocumentTitle('My Reports');
  const { user } = useAuth();

  // Reports live in a private bucket — fetch a short-lived signed URL on click.
  const openReport = async (report) => {
    try {
      const url = await storageService.reportUrl(report.report_url);
      if (url) window.open(url, '_blank', 'noopener');
    } catch {
      /* ignore — link simply won't open */
    }
  };

  const { data: reports, loading } = useFetch(
    () => diagnosticService.getMyReports(user.id),
    [user.id],
  );

  const sorted = [...(reports || [])].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          All your lab reports in one place — verified by our pathologists before release.
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={FaFileMedical}
          title="No reports yet"
          message="Reports appear here once your lab tests are completed and verified. Book a test to get started."
          actionLabel="Book a Lab Test"
          actionTo="/diagnostic-tests"
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((report) => (
            <article key={report.id} className="card flex flex-wrap items-center gap-4 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <FaFileMedical size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">{report.title || 'Lab Report'}</p>
                <p className="mt-0.5 text-xs text-gray-500">{formatDate(report.created_at)}</p>
              </div>
              <span
                className={`badge ${
                  report.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {report.is_verified ? 'Verified' : 'Processing'}
              </span>
              {report.report_url ? (
                <button
                  type="button"
                  onClick={() => openReport(report)}
                  className="btn-outline text-xs"
                  aria-label={`Download ${report.title || 'lab report'}`}
                >
                  <FaDownload aria-hidden="true" /> Download
                </button>
              ) : (
                <button type="button" className="btn-ghost text-xs" disabled aria-disabled="true">
                  <FaHourglassHalf aria-hidden="true" /> Preparing
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
