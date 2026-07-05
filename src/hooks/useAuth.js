import { useAuthContext } from '../context/AuthContext.jsx';

/** Convenience re-export so components import from hooks/ */
export default function useAuth() {
  return useAuthContext();
}
