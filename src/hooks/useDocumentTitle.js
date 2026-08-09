import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';

/**
 * Sets the browser tab title for SEO/UX, using the live brand name so it
 * follows the admin-configured brand (e.g. "Login | Medis"). Re-runs when the
 * brand loads/changes.
 */
export default function useDocumentTitle(title) {
  const { brandName } = useSettings();
  useEffect(() => {
    const brand = brandName || 'Medis';
    document.title = title ? `${title} | ${brand}` : `${brand} — Healthcare Appointments & Diagnostics`;
  }, [title, brandName]);
}
