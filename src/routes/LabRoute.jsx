import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Spinner from '../components/common/Spinner.jsx';
import { homeForRole, LAB_ROLES } from '../config/platform.js';
import AccessProblem from '../components/common/AccessProblem.jsx';

/**
 * Guards the /lab section. Same single login as everyone else — the role on
 * the profile decides. An admin who lands here is sent to the admin panel, a
 * patient to whatever their portal state allows, and a deactivated staff
 * account is stopped at the door (the database would refuse its reads anyway).
 */
export default function LabRoute({ children }) {
  const { isAuthenticated, loading, roleChecked, role, accountActive, logout, identityError } = useAuth();
  const location = useLocation();

  if (loading || (isAuthenticated && !roleChecked)) return <Spinner full />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (identityError) return <AccessProblem detail={identityError} />;

  if (!LAB_ROLES.includes(role)) {
    return <Navigate to={homeForRole(role)} replace />;
  }

  if (!accountActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-lg font-bold text-gray-900">Your account is deactivated</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your Lab Admin has switched this account off. Ask them to reactivate it and sign in again.
          </p>
          <button type="button" className="btn-outline mt-6 w-full" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return children;
}
