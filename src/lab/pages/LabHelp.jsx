import { useCallback, useEffect, useState } from 'react';
import { FaLifeRing, FaEnvelopeOpenText, FaReply } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import SupportForm from '../../components/support/SupportForm.jsx';
import { useSettings } from '../../context/SettingsContext.jsx';
import {
  supportService, TICKET_STATUS_LABELS, TICKET_STATUS_STYLES, SUPPORT_CATEGORIES,
} from '../../services/supportService.js';
import { Page, PageHeader, Card, Alert } from '../components/ui.jsx';

/**
 * Help — the lab's line to the platform admin.
 *
 * Tickets go into the same `contact_messages` queue the admin's Support
 * Tickets screen already works from, so there is one inbox rather than two.
 * The thread below is this lab's own: RLS scopes it to lab_id, so a lab never
 * sees another lab's tickets even though they share a table.
 */
export default function LabHelp() {
  const { lab, user, profile, role } = useAuth();
  const { brandName, contactEmail } = useSettings();
  useDocumentTitle('Help & Support');

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // True until section 17 of newSQL.html is applied: tickets still send, they
  // just cannot be listed back per lab yet.
  const [historyUnavailable, setHistoryUnavailable] = useState(false);

  const load = useCallback(async () => {
    if (!lab?.id) return;
    setLoading(true);
    try {
      const { tickets: rows, schemaMissing } = await supportService.listForLab(lab.id);
      setTickets(rows);
      setHistoryUnavailable(schemaMissing);
    } catch (err) {
      setError(err?.message || 'Could not load your tickets.');
    } finally {
      setLoading(false);
    }
  }, [lab?.id]);

  useEffect(() => { load(); }, [load]);

  const categoryLabel = (v) => SUPPORT_CATEGORIES.find((c) => c.value === v)?.label || v;

  return (
    <Page>
      <PageHeader
        title="Help & Support"
        subtitle={`Ask the ${brandName} team anything about your laboratory account.`}
      />

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <FaLifeRing aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900">Raise a ticket</h2>
              <p className="text-xs text-gray-500">
                Sent as {lab?.name} · {lab?.lab_ref}
              </p>
            </div>
          </div>

          <SupportForm
            lab={lab}
            userId={user?.id}
            defaults={{
              name: profile?.full_name || lab?.name || '',
              email: profile?.email || lab?.email || '',
            }}
            onSent={load}
          />
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-gray-900">Before you write</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-gray-600">
              <li>
                <strong className="text-gray-800">Approval and status</strong> — only the platform admin
                can approve, suspend or reactivate a laboratory.
              </li>
              <li>
                <strong className="text-gray-800">Staff logins</strong> — a Lab Admin creates and
                deactivates staff from the Staff screen without needing us.
              </li>
              <li>
                <strong className="text-gray-800">A stuck booking</strong> — include the BK reference so
                we can find it straight away.
              </li>
            </ul>
            {contactEmail && (
              <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
                Urgent? {contactEmail}
              </p>
            )}
          </Card>

          {role !== 'lab_admin' && (
            <Card className="bg-primary-50 p-5 text-sm text-primary-900">
              <p className="font-semibold">Tickets are shared with your lab</p>
              <p className="mt-1 text-primary-700">
                Anyone at {lab?.name} can see the tickets raised here and the replies to them.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* ---- this lab's thread ---- */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <FaEnvelopeOpenText className="text-gray-400" aria-hidden="true" />
          <h2 className="text-base font-bold text-gray-900">Your tickets</h2>
          {tickets.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              {tickets.length}
            </span>
          )}
        </div>

        {loading ? (
          <Card className="p-6 text-sm text-gray-400">Loading…</Card>
        ) : historyUnavailable ? (
          <Card className="p-6">
            <p className="text-sm text-gray-600">
              Your messages are reaching the admin, but this lab-by-lab history needs the support
              columns from <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">newSQL.html</code>
              {' '}(section 17). Run it once in the Supabase SQL Editor and your thread appears here.
            </p>
          </Card>
        ) : !tickets.length ? (
          <Card className="p-10 text-center">
            <p className="text-sm text-gray-400">
              You have not raised any tickets yet. Anything you send appears here with its reply.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li key={t.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{t.subject}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        <span className="font-mono">{t.ticket_ref}</span>
                        {' · '}
                        {categoryLabel(t.category)}
                        {' · '}
                        {new Date(t.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`badge ${TICKET_STATUS_STYLES[t.status] || 'bg-gray-100 text-gray-700'}`}>
                      {TICKET_STATUS_LABELS[t.status] || t.status}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {t.message}
                  </p>

                  {t.admin_reply && (
                    <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/70 p-4">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-700">
                        <FaReply aria-hidden="true" /> {brandName} support
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-primary-900">
                        {t.admin_reply}
                      </p>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}
