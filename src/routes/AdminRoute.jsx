import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Spinner from '../components/common/Spinner.jsx';
import { homeForRole } from '../config/platform.js';
import AccessProblem from '../components/common/AccessProblem.jsx';

/**
 * Guards the /admin section. Login is shared with regular users — the
 * role (user_profiles.role = 'admin') decides access. Not logged in →
 * the single site login. Logged in but not an admin → their dashboard.
 */
export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading, roleChecked, role, identityError } = useAuth();
  const location = useLocation();

  if (loading || (isAuthenticated && !roleChecked)) return <Spinner full />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  // Say so rather than bouncing to the public page as if the login failed.
  if (identityError) return <AccessProblem detail={identityError} />;

  if (!isAdmin) {
    return <Navigate to={homeForRole(role)} replace />;
  }
  return children;
}
