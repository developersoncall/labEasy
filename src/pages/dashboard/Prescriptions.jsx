import { FaPrescriptionBottleAlt, FaFilePdf, FaPills } from 'react-icons/fa';
import PageTransition from '../../components/common/PageTransition.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { SkeletonCard } from '../../components/common/Skeleton.jsx';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { diagnosticService } from '../../services/diagnosticService.js';
import { storageService } from '../../services/storageService.js';
import { formatDate } from '../../utils/helpers.js';

/** Prescriptions issued to the user after doctor consultations. */
export default function Prescriptions() {
  useDocumentTitle('Prescriptions');
  const { user } = useAuth();

  // Prescriptions live in a private bucket — fetch a short-lived signed URL on click.
  const openPrescription = async (p) => {
    try {
      const url = await storageService.reportUrl(p.prescription_url);
      if (url) window.open(url, '_blank', 'noopener');
    } catch {
      /* ignore — link simply won't open */
    }
  };

  const { data: prescriptions, loading } = useFetch(
    () => diagnosticService.getMyPrescriptions(user.id),
    [user.id],
  );

  const sorted = [...(prescriptions || [])].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );

  return (
    <PageTransition>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Digital prescriptions from your consultations, ready whenever you need them.
        </p>
      </header>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={FaPrescriptionBottleAlt}
          title="No prescriptions yet"
          message="Prescriptions appear here after your doctor consultations. Book a consultation to get started."
          actionLabel="Consult a Doctor"
          actionTo="/doctors"
        />
      ) : (
        <div className="space-y-4">
          {sorted.map((p) => (
            <article key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <FaPrescriptionBottleAlt size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{p.doctor_name || 'LabEasy Doctor'}</p>
                    <p className="text-xs font-medium text-primary-600">{p.specialty || 'General Physician'}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{formatDate(p.created_at)}</p>
              </div>

              {p.diagnosis && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Diagnosis</p>
                  <p className="mt-1 text-sm text-gray-700">{p.diagnosis}</p>
                </div>
              )}

              {Array.isArray(p.medicines) && p.medicines.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Medicines</p>
                  <ul className="mt-2 space-y-1.5">
                    {p.medicines.map((med, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <FaPills className="mt-1 shrink-0 text-secondary-500" size={12} aria-hidden="true" />
                        <span>
                          {typeof med === 'string'
                            ? med
                            : [med.name, med.dosage, med.frequency, med.duration]
                                .filter(Boolean)
                                .join(' · ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p.notes && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Doctor&apos;s Notes</p>
                  <p className="mt-1 text-sm text-gray-700">{p.notes}</p>
                </div>
              )}

              {p.prescription_url && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => openPrescription(p)}
                    className="btn-outline text-xs"
                    aria-label={`View prescription from ${p.doctor_name || 'doctor'}`}
                  >
                    <FaFilePdf aria-hidden="true" /> View / Download
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </PageTransition>
  );
}
