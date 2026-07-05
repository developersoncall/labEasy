import AppRoutes from './routes/AppRoutes.jsx';
import ScrollToTop from './components/common/ScrollToTop.jsx';
import SupabaseSetupNotice from './components/common/SupabaseSetupNotice.jsx';
import { isSupabaseConfigured } from './supabase/supabase.js';

export default function App() {
  if (!isSupabaseConfigured) {
    return <SupabaseSetupNotice />;
  }

  return (
    <>
      <ScrollToTop />
      <AppRoutes />
    </>
  );
}
