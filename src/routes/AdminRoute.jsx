import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Spinner from '../components/common/Spinner.jsx';

/**
 * Guards the /admin section. Login is shared with regular users — the
 * role (user_profiles.role = 'admin') decides access. Not logged in →
 * the single site login. Logged in but not an admin → their dashboard.
 */
export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading, roleChecked } = useAuth();
  const location = useLocation();

  if (loading || (isAuthenticated && !roleChecked)) return <Spinner full />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
