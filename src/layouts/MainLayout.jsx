import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar.jsx';
import Footer from '../components/common/Footer.jsx';
import CartBar from '../components/diagnostics/CartBar.jsx';

/** Public site layout: navbar + page content + floating lab cart + footer. */
export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <CartBar />
      <Footer />
    </div>
  );
}
