import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminRoute from './AdminRoute.jsx';
import LabRoute from './LabRoute.jsx';
import PortalRoute from './PortalRoute.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';

// Admin panel (self-contained tree under /admin)
const AdminApp = lazy(() => import('../admin/AdminApp.jsx'));
// Lab dashboard (self-contained tree under /lab)
const LabApp = lazy(() => import('../lab/LabApp.jsx'));

// ---- lazy-loaded pages (code-splitting for fast first paint) ----
// Platform (lab-first) public page
const PlatformHome = lazy(() => import('../pages/public/PlatformHome.jsx'));
const SupportEnquiry = lazy(() => import('../pages/public/SupportEnquiry.jsx'));

// Patient portal — kept intact, served only when public_portal_enabled is on
const Home = lazy(() => import('../pages/public/Home.jsx'));
const About = lazy(() => import('../pages/public/About.jsx'));
const Services = lazy(() => import('../pages/public/Services.jsx'));
const Doctors = lazy(() => import('../pages/public/Doctors.jsx'));
const DoctorDetails = lazy(() => import('../pages/public/DoctorDetails.jsx'));
const Specialties = lazy(() => import('../pages/public/Specialties.jsx'));
const DiagnosticTests = lazy(() => import('../pages/public/DiagnosticTests.jsx'));
const HealthPackages = lazy(() => import('../pages/public/HealthPackages.jsx'));
const PackageDetails = lazy(() => import('../pages/public/PackageDetails.jsx'));
const HomeCollection = lazy(() => import('../pages/public/HomeCollection.jsx'));
const VideoConsultation = lazy(() => import('../pages/public/VideoConsultation.jsx'));
const Contact = lazy(() => import('../pages/public/Contact.jsx'));
const FAQ = lazy(() => import('../pages/public/FAQ.jsx'));
const PrivacyPolicy = lazy(() => import('../pages/public/PrivacyPolicy.jsx'));
const Terms = lazy(() => import('../pages/public/Terms.jsx'));
const Blogs = lazy(() => import('../pages/public/Blogs.jsx'));
const BlogDetails = lazy(() => import('../pages/public/BlogDetails.jsx'));
const NotFound = lazy(() => import('../pages/public/NotFound.jsx'));

// Auth
const Login = lazy(() => import('../pages/auth/Login.jsx'));
const LabRegister = lazy(() => import('../pages/auth/LabRegister.jsx'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('../pages/auth/VerifyEmail.jsx'));

// Booking flow (patient portal)
const BookAppointment = lazy(() => import('../pages/booking/BookAppointment.jsx'));
const BookTests = lazy(() => import('../pages/booking/BookTests.jsx'));
const BookingSuccess = lazy(() => import('../pages/booking/BookingSuccess.jsx'));

// Patient dashboard (patient portal)
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard.jsx'));
const MyProfile = lazy(() => import('../pages/dashboard/MyProfile.jsx'));
const EditProfile = lazy(() => import('../pages/dashboard/EditProfile.jsx'));
const MyAppointments = lazy(() => import('../pages/dashboard/MyAppointments.jsx'));
const AppointmentDetails = lazy(() => import('../pages/dashboard/AppointmentDetails.jsx'));
const DiagnosticBookings = lazy(() => import('../pages/dashboard/DiagnosticBookings.jsx'));
const MyReports = lazy(() => import('../pages/dashboard/MyReports.jsx'));
const Prescriptions = lazy(() => import('../pages/dashboard/Prescriptions.jsx'));
const Notifications = lazy(() => import('../pages/dashboard/Notifications.jsx'));
const FavoriteDoctors = lazy(() => import('../pages/dashboard/FavoriteDoctors.jsx'));
const Settings = lazy(() => import('../pages/dashboard/Settings.jsx'));

/**
 * Routing has two shapes, chosen by the `public_portal_enabled` setting:
 *
 *   off (now)  informational home + auth + /lab + /admin. Patient routes exist
 *              but redirect home through PortalRoute.
 *   on         the original patient site returns at "/" alongside everything
 *              the lab-first architecture added.
 */
export default function AppRoutes() {
  const { publicPortalEnabled } = useSettings();

  return (
    <CartProvider>
      <Suspense fallback={<Spinner full />}>
        <Routes>
          {/* -------- the public door -------- */}
          {!publicPortalEnabled && <Route path="/" element={<PlatformHome />} />}
          {/* Pre-registration enquiries work whether or not the portal is on. */}
          <Route path="/support" element={<SupportEnquiry />} />

          {/* -------- patient portal (gated) -------- */}
          <Route element={<MainLayout />}>
            {publicPortalEnabled && <Route path="/" element={<Home />} />}
            <Route path="/about" element={<PortalRoute><About /></PortalRoute>} />
            <Route path="/services" element={<PortalRoute><Services /></PortalRoute>} />
            <Route path="/doctors" element={<PortalRoute><Doctors /></PortalRoute>} />
            <Route path="/doctors/:slug" element={<PortalRoute><DoctorDetails /></PortalRoute>} />
            <Route path="/specialties" element={<PortalRoute><Specialties /></PortalRoute>} />
            <Route path="/diagnostic-tests" element={<PortalRoute><DiagnosticTests /></PortalRoute>} />
            <Route path="/health-packages" element={<PortalRoute><HealthPackages /></PortalRoute>} />
            <Route path="/health-packages/:slug" element={<PortalRoute><PackageDetails /></PortalRoute>} />
            <Route path="/home-collection" element={<PortalRoute><HomeCollection /></PortalRoute>} />
            <Route path="/video-consultation" element={<PortalRoute><VideoConsultation /></PortalRoute>} />
            <Route path="/contact" element={<PortalRoute><Contact /></PortalRoute>} />
            <Route path="/faq" element={<PortalRoute><FAQ /></PortalRoute>} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/blogs" element={<PortalRoute><Blogs /></PortalRoute>} />
            <Route path="/blogs/:slug" element={<PortalRoute><BlogDetails /></PortalRoute>} />

            {/* booking flow (requires login + the portal) */}
            <Route
              path="/book-appointment/:slug"
              element={<PortalRoute><ProtectedRoute><BookAppointment /></ProtectedRoute></PortalRoute>}
            />
            <Route
              path="/book-tests"
              element={<PortalRoute><ProtectedRoute><BookTests /></ProtectedRoute></PortalRoute>}
            />
            <Route
              path="/booking-success"
              element={<PortalRoute><ProtectedRoute><BookingSuccess /></ProtectedRoute></PortalRoute>}
            />

            {publicPortalEnabled && <Route path="*" element={<NotFound />} />}
          </Route>

          {/* -------- auth (shared by every role) -------- */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            {/* Only laboratories can register for now. */}
            <Route path="/register" element={<LabRegister />} />
            <Route path="/register-lab" element={<LabRegister />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Route>

          {/* -------- patient dashboard (portal only) -------- */}
          <Route element={<PortalRoute><ProtectedRoute><DashboardLayout /></ProtectedRoute></PortalRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/profile" element={<MyProfile />} />
            <Route path="/dashboard/edit-profile" element={<EditProfile />} />
            <Route path="/dashboard/appointments" element={<MyAppointments />} />
            <Route path="/dashboard/appointments/:id" element={<AppointmentDetails />} />
            <Route path="/dashboard/diagnostic-bookings" element={<DiagnosticBookings />} />
            <Route path="/dashboard/reports" element={<MyReports />} />
            <Route path="/dashboard/prescriptions" element={<Prescriptions />} />
            <Route path="/dashboard/notifications" element={<Notifications />} />
            <Route path="/dashboard/favorites" element={<FavoriteDoctors />} />
            <Route path="/dashboard/settings" element={<Settings />} />
          </Route>

          {/* -------- lab dashboard (lab_admin / receptionist / tester / reportist) -------- */}
          <Route path="/lab/*" element={<LabRoute><LabApp /></LabRoute>} />

          {/* -------- admin panel (same login; role decides access) -------- */}
          <Route path="/admin/*" element={<AdminRoute><AdminApp /></AdminRoute>} />

          {/* While the patient portal is off, anything unknown goes to the public page. */}
          {!publicPortalEnabled && <Route path="*" element={<Navigate to="/" replace />} />}
        </Routes>
      </Suspense>
    </CartProvider>
  );
}
