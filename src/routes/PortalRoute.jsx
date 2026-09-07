import { Navigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import Spinner from '../components/common/Spinner.jsx';

/**
 * Gate for everything that belongs to the patient-facing portal — the doctor
 * and test catalogue, the booking flow and the patient dashboard.
 *
 * While `public_portal_enabled` is false those routes send visitors back to
 * the informational home page. Nothing is deleted: flip the setting in the
 * database and every one of these screens returns exactly as it was.
 */
export default function PortalRoute({ children }) {
  const { publicPortalEnabled, loading } = useSettings();
  if (loading) return <Spinner full />;
  if (!publicPortalEnabled) return <Navigate to="/" replace />;
  return children;
}
