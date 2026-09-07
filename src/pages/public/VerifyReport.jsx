import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaCheckCircle, FaTimesCircle, FaShieldAlt, FaFlask } from 'react-icons/fa';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Spinner from '../../components/common/Spinner.jsx';
import { deliveryService } from '../../services/deliveryService.js';

/**
 * The page a report's QR code leads to.
 *
 * It answers one question — did this laboratory really issue this report — and
 * refuses to answer any other. There are no results here, no full name, no
 * phone number: a printed report can be dropped in a waiting room, and whoever
 * picks it up should be able to confirm it is genuine without learning
 * anything about the person it belongs to.
 *
 * Reachable signed out, which is the point: the doctor holding the paper is
 * not a user of this platform.
 */
export default function VerifyReport() {
  const { token } = useParams();
  useDocumentTitle('Verify a report');

  const [state, setState] = useState({ loading: true, result: null, schemaMissing: false });

  useEffect(() => {
    let alive = true;
    deliveryService
      .verify(token)
      .then(({ result, schemaMissing }) => {
        if (alive) setState({ loading: false, result, schemaMissing });
      })
      .catch(() => alive && setState({ loading: false, result: null, schemaMissing: false }));
    return () => { alive = false; };
  }, [token]);

  const { loading, result, schemaMissing } = state;
  const ok = !!result?.found;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className={`px-6 py-6 text-center ${ok ? 'bg-emerald-50' : 'bg-gray-50'}`}>
          {loading ? (
            <Spinner />
          ) : ok ? (
            <>
              <FaCheckCircle className="mx-auto text-4xl text-emerald-500" aria-hidden="true" />
              <h1 className="mt-3 text-xl font-bold text-gray-900">Report verified</h1>
              <p className="mt-1 text-sm text-gray-600">
                This report was issued by the laboratory named below.
              </p>
            </>
          ) : (
            <>
              <FaTimesCircle className="mx-auto text-4xl text-gray-400" aria-hidden="true" />
              <h1 className="mt-3 text-xl font-bold text-gray-900">Not recognised</h1>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {schemaMissing
                  ? 'Report verification is not switched on for this site yet.'
                  : 'No approved report matches this code. Check the link, or ask the laboratory that issued the report.'}
              </p>
            </>
          )}
        </div>

        {ok && (
          <dl className="divide-y divide-gray-100">
            {[
              ['Laboratory', [result.lab_name, result.lab_city].filter(Boolean).join(', ')],
              ['Report reference', result.report_ref],
              ['Booking reference', result.booking_ref],
              ['Patient', result.patient_label],
              ['Reported on', result.reported_on ? new Date(result.reported_on).toLocaleString() : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 px-6 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
                  {label}
                </dt>
                <dd className="text-right text-sm font-medium text-gray-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="border-t border-gray-100 bg-gray-50/70 px-6 py-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-500">
            <FaShieldAlt className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
            This page confirms a report exists and who issued it. Results are never shown here —
            ask the laboratory for the document itself.
          </p>
        </div>
      </div>

      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
      >
        <FaFlask aria-hidden="true" /> Back to the home page
      </Link>
    </div>
  );
}
