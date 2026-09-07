import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaRupeeSign, FaPrint, FaFileInvoiceDollar, FaExclamationTriangle, FaCheckCircle, FaPlus,
} from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Spinner from '../../components/common/Spinner.jsx';
import PaymentModal from '../components/PaymentModal.jsx';
import NewBillModal from '../components/NewBillModal.jsx';
import { labBookingService, todayISO } from '../../services/labBookingService.js';
import { billingService, dueOf } from '../../services/billingService.js';
import { buildReceiptPdf } from '../report/receiptPdf.js';
import { formatCurrency } from '../../utils/helpers.js';
import {
  Page, PageHeader, TableFrame, Td, Row, SearchBox, FilterTabs, Alert, Stat, StatGrid,
} from '../components/ui.jsx';

/**
 * Every bill this laboratory has raised.
 *
 * The same money the Bookings screen shows, sorted by the question the counter
 * actually asks at the end of a shift: who still owes us. A bill is not a
 * separate record — it *is* the booking, which is why a payment taken here
 * moves the booking on exactly as it would from reception.
 *
 * Open to the Lab Admin and the receptionist. Accounts, which shows margin and
 * expenses, is the Lab Admin's alone.
 */

const FILTERS = [
  { key: 'due', label: 'Unpaid' },
  { key: 'today', label: 'Today' },
  { key: 'paid', label: 'Settled' },
  { key: 'all', label: 'All bills' },
];

export default function LabBilling() {
  const { labId, lab, user, profile } = useAuth();
  useDocumentTitle('Billing');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('due');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [payFor, setPayFor] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [newBill, setNewBill] = useState(false);

  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    try {
      setRows(await labBookingService.listForLab(labId, { limit: 400 }));
    } catch (err) {
      setError(err?.message || 'Could not load the bills.');
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => { load(); }, [load]);

  const bills = useMemo(() => {
    const today = todayISO();
    const term = search.trim().toLowerCase();
    return rows
      .filter((b) => b.workflow_status !== 'cancelled')
      .filter((b) => {
        if (filter === 'due') return dueOf(b) > 0;
        if (filter === 'paid') return dueOf(b) <= 0;
        if (filter === 'today') return b.scheduled_date === today;
        return true;
      })
      .filter((b) => {
        if (!term) return true;
        return (
          (b.patient_name || '').toLowerCase().includes(term) ||
          (b.bill_no || '').toLowerCase().includes(term) ||
          (b.booking_ref || '').toLowerCase().includes(term) ||
          (b.patient_phone || '').includes(term)
        );
      });
  }, [rows, filter, search]);

  const totals = useMemo(() => {
    const today = todayISO();
    const live = rows.filter((b) => b.workflow_status !== 'cancelled');
    return {
      billedToday: live
        .filter((b) => b.scheduled_date === today)
        .reduce((n, b) => n + Number(b.total_amount || 0), 0),
      collectedToday: live
        .filter((b) => b.scheduled_date === today)
        .reduce((n, b) => n + Number(b.amount_paid || 0), 0),
      outstanding: live.reduce((n, b) => n + dueOf(b), 0),
      unpaidCount: live.filter((b) => dueOf(b) > 0).length,
    };
  }, [rows]);

  const counts = useMemo(() => {
    const today = todayISO();
    const live = rows.filter((b) => b.workflow_status !== 'cancelled');
    return {
      due: live.filter((b) => dueOf(b) > 0).length,
      paid: live.filter((b) => dueOf(b) <= 0).length,
      today: live.filter((b) => b.scheduled_date === today).length,
      all: live.length,
    };
  }, [rows]);

  const printReceipt = async (booking) => {
    setPrinting(booking.id);
    setError('');
    try {
      const { payments } = await billingService.listForBooking(booking.id).catch(() => ({ payments: [] }));
      const blob = await buildReceiptPdf({
        lab,
        booking,
        payments,
        items: Array.isArray(booking.items) ? booking.items : [],
        issuedBy: profile?.full_name || user?.email || '',
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err?.message || 'Could not build that receipt.');
    } finally {
      setPrinting(null);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Billing"
        subtitle="Every bill raised, and what is still owed on it."
      >
        <button type="button" className="btn-primary" onClick={() => setNewBill(true)}>
          <FaPlus aria-hidden="true" /> New bill
        </button>
      </PageHeader>

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      <StatGrid>
        <Stat
          label="Billed today"
          value={formatCurrency(totals.billedToday)}
          icon={<FaFileInvoiceDollar />}
        />
        <Stat
          label="Collected today"
          value={formatCurrency(totals.collectedToday)}
          tone="success"
          icon={<FaRupeeSign />}
        />
        <Stat
          label="Outstanding"
          value={formatCurrency(totals.outstanding)}
          hint={`${totals.unpaidCount} unpaid bill${totals.unpaidCount === 1 ? '' : 's'}`}
          tone={totals.outstanding > 0 ? 'warning' : 'muted'}
          icon={<FaExclamationTriangle />}
        />
        <Stat label="Bills" value={counts.all} tone="muted" hint="excluding cancelled" />
      </StatGrid>

      <FilterTabs
        tabs={FILTERS.map((f) => ({ ...f, count: counts[f.key] }))}
        active={filter}
        onChange={setFilter}
      />

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Search by bill number, patient or phone…"
      />

      {loading ? (
        <Spinner />
      ) : (
        <TableFrame
          head={[
            'Bill', 'Patient', 'Date',
            { label: 'Total', align: 'right' },
            { label: 'Paid', align: 'right' },
            { label: 'Due', align: 'right' },
            { label: 'Actions', align: 'right' },
          ]}
          empty={bills.length === 0}
          emptyIcon="🧾"
          emptyText={
            filter === 'due'
              ? 'Every bill is settled.'
              : 'No bills match this view yet.'
          }
        >
          {bills.map((b) => {
            const due = dueOf(b);
            const discount = Number(b.subtotal_amount ?? b.total_amount) - Number(b.total_amount || 0);
            return (
              <Row key={b.id}>
                <Td>
                  <p className="whitespace-nowrap font-mono text-xs text-gray-700">
                    {b.bill_no || b.booking_ref}
                  </p>
                  {discount > 0 && (
                    <p className="whitespace-nowrap text-[11px] text-emerald-700">
                      {formatCurrency(discount)} off
                    </p>
                  )}
                </Td>
                <Td>
                  <p className="font-medium text-gray-900">{b.patient_name || 'Walk-in'}</p>
                  {b.patient_phone && (
                    <p className="text-xs text-gray-400">{b.patient_phone}</p>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-gray-600">{b.scheduled_date}</Td>
                <Td className="whitespace-nowrap text-right tabular-nums text-gray-900">
                  {formatCurrency(b.total_amount)}
                </Td>
                <Td className="whitespace-nowrap text-right tabular-nums text-gray-600">
                  {formatCurrency(b.amount_paid)}
                </Td>
                <Td className="whitespace-nowrap text-right">
                  {due > 0 ? (
                    <span className="font-bold tabular-nums text-amber-700">
                      {formatCurrency(due)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <FaCheckCircle aria-hidden="true" />
                      <span className="text-xs font-semibold">Settled</span>
                    </span>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="btn-soft whitespace-nowrap px-3 py-1.5 text-xs"
                      onClick={() => printReceipt(b)}
                      disabled={printing === b.id}
                    >
                      <FaPrint aria-hidden="true" />
                      {printing === b.id ? 'Building…' : 'Receipt'}
                    </button>
                    <button
                      type="button"
                      className={`${due > 0 ? 'btn-primary' : 'btn-soft'} whitespace-nowrap px-3.5 py-1.5 text-xs`}
                      onClick={() => setPayFor(b)}
                    >
                      <FaRupeeSign aria-hidden="true" />
                      {due > 0 ? 'Take payment' : 'Bill'}
                    </button>
                  </div>
                </Td>
              </Row>
            );
          })}
        </TableFrame>
      )}

      <PaymentModal booking={payFor} onClose={() => setPayFor(null)} onSave={load} />

      <NewBillModal open={newBill} onClose={() => setNewBill(false)} onSaved={load} />
    </Page>
  );
}
