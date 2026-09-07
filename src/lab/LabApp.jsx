import { Routes, Route, Navigate } from 'react-router-dom';
import LabShell from './components/LabShell.jsx';
import LabPending from './pages/LabPending.jsx';
import LabDashboard from './pages/LabDashboard.jsx';
import LabToday from './pages/LabToday.jsx';
import LabBookings from './pages/LabBookings.jsx';
import LabPatients from './pages/LabPatients.jsx';
import LabBilling from './pages/LabBilling.jsx';
import LabAccounts from './pages/LabAccounts.jsx';
import LabTesting from './pages/LabTesting.jsx';
import LabReports from './pages/LabReports.jsx';
import LabTests from './pages/LabTests.jsx';
import LabStaff from './pages/LabStaff.jsx';
import LabSettings from './pages/LabSettings.jsx';
import LabHelp from './pages/LabHelp.jsx';
import useAuth from '../hooks/useAuth.js';
import Spinner from '../components/common/Spinner.jsx';
import { canAccessLabSection } from '../config/platform.js';

/**
 * The Lab Dashboard — one interface for the whole laboratory.
 *
 * Every role in a lab uses these same screens; what changes is which sections
 * the sidebar offers and which actions each screen renders. A staff member who
 * types a URL they may not use is bounced back to their own landing section,
 * and the database would refuse the write anyway.
 */

/** Redirects a role to the first section it is actually allowed to open. */
function SectionRoute({ section, children }) {
  const { role } = useAuth();
  if (!canAccessLabSection(role, section)) return <Navigate to="/lab" replace />;
  return children;
}

export default function LabApp() {
  const { lab, roleChecked, loading } = useAuth();

  if (loading || !roleChecked) return <Spinner full />;

  // No approved lab yet → the status screen (pending / rejected / suspended,
  // or the "finish your registration" step after e-mail confirmation).
  if (!lab || lab.status !== 'approved') return <LabPending />;

  return (
    <LabShell>
      <Routes>
        <Route index element={<LabDashboard />} />
        <Route path="today" element={<SectionRoute section="today"><LabToday /></SectionRoute>} />
        <Route path="bookings" element={<SectionRoute section="bookings"><LabBookings /></SectionRoute>} />
        <Route path="patients" element={<SectionRoute section="patients"><LabPatients /></SectionRoute>} />
        <Route path="billing" element={<SectionRoute section="billing"><LabBilling /></SectionRoute>} />
        <Route path="testing" element={<SectionRoute section="testing"><LabTesting /></SectionRoute>} />
        <Route path="reports" element={<SectionRoute section="reports"><LabReports /></SectionRoute>} />
        <Route path="tests" element={<SectionRoute section="tests"><LabTests /></SectionRoute>} />
        <Route path="accounts" element={<SectionRoute section="accounts"><LabAccounts /></SectionRoute>} />
        <Route path="staff" element={<SectionRoute section="staff"><LabStaff /></SectionRoute>} />
        <Route path="settings" element={<SectionRoute section="settings"><LabSettings /></SectionRoute>} />
        <Route path="help" element={<SectionRoute section="help"><LabHelp /></SectionRoute>} />
        <Route path="*" element={<Navigate to="/lab" replace />} />
      </Routes>
    </LabShell>
  );
}
