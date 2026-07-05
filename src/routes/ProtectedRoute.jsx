import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Spinner from '../components/common/Spinner.jsx';

/**
 * Guards authenticated routes. Redirects to /login and remembers the
 * intended destination so login can bounce the user back.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner full />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}
