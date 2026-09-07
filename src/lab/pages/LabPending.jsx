import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaHourglassHalf, FaTimesCircle, FaPauseCircle, FaFlask, FaSignOutAlt, FaCheckCircle,
} from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import { useSettings } from '../../context/SettingsContext.jsx';
import LabForm from '../../components/lab/LabForm.jsx';
import { labService } from '../../services/labService.js';
import { PENDING_LAB_KEY } from '../../config/platform.js';

/**
 * What a lab account sees before (or instead of) the dashboard.
 *
 *   no lab yet  → finish the registration that e-mail confirmation interrupted
 *   pending     → waiting on the platform admin
 *   rejected    → the reason, so they can fix it and talk to us
 *   suspended   → access paused; the data is untouched
 */
export default function LabPending() {
  const { lab, user, logout, refreshIdentity } = useAuth();
  const { brandName } = useSettings();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const parked = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(PENDING_LAB_KEY) || 'null');
    } catch {
      return null;
    }
  })();

  const signOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const fileRegistration = async (values) => {
    setError('');
    try {
      await labService.register({ ...values, email: values.email || user?.email }, user.id);
      sessionStorage.removeItem(PENDING_LAB_KEY);
      await refreshIdentity();
    } catch (err) {
      setError(err?.message || 'Could not file the registration. Please try again.');
    }
  };

  const Frame = ({ children }) => (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50/50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
            <FaFlask aria-hidden="true" />
          </span>
          <span className="text-xl font-bold text-gray-900">{brandName}</span>
        </div>
        {children}
        <button type="button" onClick={signOut} className="btn-ghost mt-4 w-full text-sm">
          <FaSignOutAlt aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );

  // ---- registration never got filed (e-mail confirmation path) -------------
  if (!lab) {
    return (
      <Frame>
        <div className="card p-8">
          <FaCheckCircle className="text-3xl text-emerald-500" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-bold text-gray-900">Finish your registration</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            Your account is confirmed. Submit your laboratory details and an administrator will review them.
          </p>
          {error && (
            <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-6">
            <LabForm
              defaultValues={parked || {}}
              onSubmit={fileRegistration}
              submitLabel="Submit registration"
            />
          </div>
        </div>
      </Frame>
    );
  }

  const VIEWS = {
    pending: {
      icon: <FaHourglassHalf className="text-3xl text-amber-500" aria-hidden="true" />,
      title: 'Registration under review',
      body: `Thanks for registering ${lab.name}. An administrator is reviewing your details — this usually takes less than a working day. You will land straight in your dashboard once it is approved.`,
      tone: 'border-amber-100 bg-amber-50 text-amber-800',
      note: 'Nothing else to do right now. Sign in again later to check.',
    },
    rejected: {
      icon: <FaTimesCircle className="text-3xl text-red-500" aria-hidden="true" />,
      title: 'Registration not approved',
      body: `We could not approve ${lab.name} at this time.`,
      tone: 'border-red-100 bg-red-50 text-red-700',
      note: lab.rejection_reason || 'No reason was recorded. Please get in touch and we will take another look.',
    },
    suspended: {
      icon: <FaPauseCircle className="text-3xl text-orange-500" aria-hidden="true" />,
      title: 'Access paused',
      body: `${lab.name} has been suspended by the platform administrator. Your data is safe and untouched — access returns as soon as the suspension is lifted.`,
      tone: 'border-orange-100 bg-orange-50 text-orange-800',
      note: 'Contact the platform administrator to resolve this.',
    },
    inactive: {
      icon: <FaPauseCircle className="text-3xl text-gray-500" aria-hidden="true" />,
      title: 'Laboratory deactivated',
      body: `${lab.name} is currently deactivated.`,
      tone: 'border-gray-200 bg-gray-50 text-gray-700',
      note: 'Contact the platform administrator to reactivate it.',
    },
  };

  const view = VIEWS[lab.status] || VIEWS.pending;

  return (
    <Frame>
      <div className="card p-8">
        {view.icon}
        <h1 className="mt-3 text-xl font-bold text-gray-900">{view.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{view.body}</p>

        <dl className="mt-6 space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Laboratory</dt>
            <dd className="font-semibold text-gray-900">{lab.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Reference</dt>
            <dd className="font-mono text-gray-700">{lab.lab_ref || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Status</dt>
            <dd className="font-semibold capitalize text-gray-900">{lab.status}</dd>
          </div>
        </dl>

        <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${view.tone}`}>{view.note}</p>
      </div>
    </Frame>
  );
}
