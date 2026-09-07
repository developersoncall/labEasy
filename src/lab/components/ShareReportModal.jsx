import { useCallback, useEffect, useState } from 'react';
import {
  FaWhatsapp, FaSms, FaEnvelope, FaLink, FaCheck, FaCopy, FaQrcode, FaHistory,
} from 'react-icons/fa';
import Modal from '../../components/common/Modal.jsx';
import useAuth from '../../hooks/useAuth.js';
import {
  deliveryService, reportMessage, verifyUrl, waNumber, CHANNELS,
} from '../../services/deliveryService.js';
import { labReportService } from '../../services/labReportService.js';
import { Alert } from './ui.jsx';

/**
 * Send the report to the patient, and record that it went.
 *
 * The sending happens on the staff member's own device — their WhatsApp, their
 * mail client, their phone's messages app. That is deliberate: routing patient
 * reports through a third-party gateway is a data-protection decision a lab
 * makes with its own business account, not something a platform should quietly
 * do on their behalf. What this screen guarantees is that whatever route was
 * used, the lab has a record of it.
 *
 * The link that goes with the message verifies the report; it does not contain
 * it. Anyone can confirm the lab issued reference X on date Y — nobody can
 * read a stranger's results by guessing a URL.
 */
export default function ShareReportModal({ booking, report, onClose, onSent }) {
  const { lab, labId, user } = useAuth();

  const [token, setToken] = useState(report?.public_token || null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [phone, setPhone] = useState(booking?.patient_phone || '');
  const [email, setEmail] = useState(booking?.patient_email || '');
  const [showQr, setShowQr] = useState(false);
  const [qr, setQr] = useState('');

  const load = useCallback(async () => {
    if (!report?.id) return;
    setLoading(true);
    try {
      if (!token) {
        const full = await labReportService.get(report.id).catch(() => null);
        if (full?.public_token) setToken(full.public_token);
      }
      const { deliveries: rows } = await deliveryService.listForReport(report.id);
      setDeliveries(rows);
    } catch (err) {
      setError(err?.message || 'Could not load the delivery history.');
    } finally {
      setLoading(false);
    }
  }, [report?.id, token]);

  useEffect(() => { load(); }, [load]);

  const link = token ? verifyUrl(token) : '';
  const message = reportMessage({ lab, booking, report, url: link });

  const log = async (channel, destination) => {
    await deliveryService
      .log({ reportId: report.id, bookingId: booking?.id, labId, channel, destination, sentBy: user?.id })
      .catch(() => {});
    await load();
    await onSent?.();
  };

  const openWhatsApp = async () => {
    const to = waNumber(phone);
    if (!to) return setError('Add a phone number first.');
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    await log('whatsapp', phone);
    return undefined;
  };

  const openSms = async () => {
    if (!phone) return setError('Add a phone number first.');
    window.location.href = `sms:${phone}?&body=${encodeURIComponent(message)}`;
    await log('sms', phone);
    return undefined;
  };

  const openEmail = async () => {
    if (!email) return setError('Add an email address first.');
    const subject = `Your laboratory report — ${report?.report_ref || booking?.booking_ref || ''}`;
    window.location.href =
      `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    await log('email', email);
    return undefined;
  };

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 2000);
      if (what === 'link') await log('link', link);
    } catch {
      setError('Your browser would not let the page copy that. Select it and copy by hand.');
    }
  };

  const toggleQr = async () => {
    if (!showQr && !qr && link) {
      try {
        const QRCode = (await import('qrcode')).default;
        setQr(await QRCode.toDataURL(link, { margin: 1, width: 220 }));
      } catch {
        setError('Could not draw the QR code.');
      }
    }
    setShowQr((v) => !v);
  };

  return (
    <Modal open onClose={onClose} title="Send the report" maxWidth="max-w-lg">
      <div className="space-y-5">
        {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <p className="font-semibold text-gray-900">{booking?.patient_name || 'Patient'}</p>
          <p className="font-mono text-xs text-gray-500">
            {report?.report_ref || booking?.booking_ref}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="form-label" htmlFor="sh-phone">Phone</label>
            <div className="flex gap-2">
              <input
                id="sh-phone"
                className="input-field"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Patient's mobile number"
              />
              <button type="button" className="btn-soft shrink-0 px-3 text-sm" onClick={openWhatsApp}>
                <FaWhatsapp className="text-emerald-600" aria-hidden="true" /> WhatsApp
              </button>
              <button type="button" className="btn-soft shrink-0 px-3 text-sm" onClick={openSms}>
                <FaSms aria-hidden="true" /> SMS
              </button>
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="sh-email">Email</label>
            <div className="flex gap-2">
              <input
                id="sh-email"
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Patient's email address"
              />
              <button type="button" className="btn-soft shrink-0 px-3 text-sm" onClick={openEmail}>
                <FaEnvelope aria-hidden="true" /> Email
              </button>
            </div>
          </div>
        </div>

        {link ? (
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <FaLink className="text-gray-400" aria-hidden="true" /> Verification link
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Confirms this lab issued this report. It does not show the results.
            </p>
            <div className="mt-2 flex gap-2">
              <input className="input-field h-9 py-1 font-mono text-xs" value={link} readOnly />
              <button
                type="button"
                className="btn-soft shrink-0 px-3 py-1.5 text-xs"
                onClick={() => copy(link, 'link')}
              >
                {copied === 'link' ? <FaCheck className="text-emerald-600" /> : <FaCopy />}
                {copied === 'link' ? 'Copied' : 'Copy'}
              </button>
              <button type="button" className="btn-soft shrink-0 px-3 py-1.5 text-xs" onClick={toggleQr}>
                <FaQrcode aria-hidden="true" /> QR
              </button>
            </div>
            {showQr && qr && (
              <div className="mt-3 flex justify-center">
                <img src={qr} alt="QR code for the verification link" className="h-40 w-40" />
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
            Verification links need <code className="font-mono">phase2.sql</code> to be run in the
            Supabase SQL Editor.
          </p>
        )}

        <div className="rounded-xl border border-gray-200">
          <header className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
            <FaHistory className="text-gray-400" aria-hidden="true" />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
              Sent
            </h4>
          </header>
          {loading ? (
            <p className="px-4 py-3 text-sm text-gray-400">Loading…</p>
          ) : deliveries.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Not sent to the patient yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {deliveries.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="text-gray-800">
                    {CHANNELS[d.channel] || d.channel}
                    {d.destination && <span className="text-gray-400"> · {d.destination}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(d.sent_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" className="btn-outline w-full" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
