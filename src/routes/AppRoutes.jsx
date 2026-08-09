import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';
import AuthLayout from '../layouts/AuthLayout.jsx';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import AdminRoute from './AdminRoute.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { CartProvider } from '../context/CartContext.jsx';

// Admin panel (self-contained tree under /admin)
const AdminApp = lazy(() => import('../admin/AdminApp.jsx'));

// ---- lazy-loaded pages (code-splitting for fast first paint) ----
// Public
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
const Register = lazy(() => import('../pages/auth/Register.jsx'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('../pages/auth/VerifyEmail.jsx'));

// Booking flow
const BookAppointment = lazy(() => import('../pages/booking/BookAppointment.jsx'));
const BookTests = lazy(() => import('../pages/booking/BookTests.jsx'));
const BookingSuccess = lazy(() => import('../pages/booking/BookingSuccess.jsx'));

// Dashboard
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

export default function AppRoutes() {
  return (
    <CartProvider>
      <Suspense fallback={<Spinner full />}>
        <Routes>
          {/* -------- public site -------- */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/doctors/:slug" element={<DoctorDetails />} />
            <Route path="/specialties" element={<Specialties />} />
            <Route path="/diagnostic-tests" element={<DiagnosticTests />} />
            <Route path="/health-packages" element={<HealthPackages />} />
            <Route path="/health-packages/:slug" element={<PackageDetails />} />
            <Route path="/home-collection" element={<HomeCollection />} />
            <Route path="/video-consultation" element={<VideoConsultation />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/blogs/:slug" element={<BlogDetails />} />

            {/* booking flow (requires login) */}
            <Route
              path="/book-appointment/:slug"
              element={<ProtectedRoute><BookAppointment /></ProtectedRoute>}
            />
            <Route
              path="/book-tests"
              element={<ProtectedRoute><BookTests /></ProtectedRoute>}
            />
            <Route
              path="/booking-success"
              element={<ProtectedRoute><BookingSuccess /></ProtectedRoute>}
            />

            <Route path="*" element={<NotFound />} />
          </Route>

          {/* -------- auth -------- */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Route>

          {/* -------- dashboard (protected) -------- */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
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

          {/* -------- admin panel (same login as users; role decides access) -------- */}
          <Route
            path="/admin/*"
            element={<AdminRoute><AdminApp /></AdminRoute>}
          />
        </Routes>
      </Suspense>
    </CartProvider>
  );
}
