import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaPlus, FaTrash, FaArrowDown, FaArrowUp, FaBalanceScale, FaExclamationTriangle,
  FaFileInvoiceDollar,
} from 'react-icons/fa';
import useAuth from '../../hooks/useAuth.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import Spinner from '../../components/common/Spinner.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import {
  accountingService, EXPENSE_CATEGORIES, categoryLabel, todayISO, monthStart,
} from '../../services/accountingService.js';
import { methodLabel, PAYMENT_METHODS } from '../../services/billingService.js';
import { formatCurrency } from '../../utils/helpers.js';
import {
  Page, PageHeader, Stat, StatGrid, TableFrame, Td, Row, Alert, FilterTabs,
} from '../components/ui.jsx';

/**
 * The day book: what came in, what went out, what is still owed.
 *
 * Collection is not typed in anywhere — it is the sum of the payment rows the
 * counter already created taking money, so it is right by construction. Only
 * expenses need entering, because nothing else in the system knows about them.
 *
 * Lab Admin only. A receptionist can see a bill; the books are a different
 * thing, and the database enforces that too.
 */

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Last 7 days' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'Last 12 months' },
];

function rangeDates(key) {
  const today = todayISO();
  if (key === 'today') return { from: today, to: today };
  if (key === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return { from: d.toLocaleDateString('en-CA'), to: today };
  }
  if (key === 'month') return { from: monthStart(), to: today };
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return { from: d.toLocaleDateString('en-CA'), to: today };
}

/** A plain bar row — enough to see the shape of a split without a chart library. */
function Split({ rows, total, empty }) {
  if (!rows.length) return <p className="px-4 py-3 text-sm text-gray-400">{empty}</p>;
  return (
    <ul className="space-y-2.5 px-4 py-3">
      {rows.map(([label, value]) => (
        <li key={label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-gray-700">{label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-gray-900">
              {formatCurrency(value)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary-500"
              style={{ width: `${total > 0 ? Math.max((value / total) * 100, 2) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, right, children, bodyClass = '' }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-baseline justify-between gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{title}</h4>
        {right}
      </header>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

const emptyExpense = {
  spentOn: todayISO(), category: 'reagents', description: '', vendor: '',
  amount: '', paymentMethod: 'cash', reference: '',
};

export default function LabAccounts() {
  const { labId, user } = useAuth();
  useDocumentTitle('Accounts');

  const [range, setRange] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('collection');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyExpense);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const dates = useMemo(() => rangeDates(range), [range]);

  const load = useCallback(async () => {
    if (!labId) return;
    setLoading(true);
    try {
      setData(await accountingService.summary(labId, dates));
    } catch (err) {
      setError(err?.message || 'Could not load the accounts.');
    } finally {
      setLoading(false);
    }
  }, [labId, dates]);

  useEffect(() => { load(); }, [load]);

  const addExpense = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await accountingService.addExpense(labId, form, user?.id);
      setForm({ ...emptyExpense, category: form.category });
      setAddOpen(false);
      await load();
    } catch (err) {
      setError(err?.message || 'Could not save that expense.');
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Page>
      <PageHeader
        title="Accounts"
        subtitle="Collection, expenses and what is still owed."
      >
        <div className="flex flex-wrap gap-2">
          <select
            className="input-field h-10 w-auto py-1.5 text-sm"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label="Period"
          >
            {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <button type="button" className="btn-primary whitespace-nowrap" onClick={() => setAddOpen((v) => !v)}>
            <FaPlus aria-hidden="true" /> Add expense
          </button>
        </div>
      </PageHeader>

      {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}

      {data?.schemaMissing && (
        <Alert tone="warning">
          Accounting needs <code className="font-mono">phase2.sql</code> to be run in the Supabase
          SQL Editor — it creates the payment ledger and the expenses table.
        </Alert>
      )}

      {addOpen && (
        <form className="space-y-3 rounded-xl border border-gray-200 bg-white p-4" onSubmit={addExpense}>
          <h3 className="text-sm font-bold text-gray-900">New expense</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="form-label" htmlFor="e-date">Date</label>
              <input id="e-date" type="date" className="input-field" value={form.spentOn} onChange={set('spentOn')} />
            </div>
            <div>
              <label className="form-label" htmlFor="e-cat">Category</label>
              <select id="e-cat" className="input-field" value={form.category} onChange={set('category')}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="e-amount">Amount *</label>
              <input id="e-amount" type="number" min="0" step="0.01" className="input-field" value={form.amount} onChange={set('amount')} required />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="e-desc">Description</label>
              <input id="e-desc" className="input-field" placeholder="What was it for?" value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="form-label" htmlFor="e-vendor">Paid to</label>
              <input id="e-vendor" className="input-field" value={form.vendor} onChange={set('vendor')} />
            </div>
            <div>
              <label className="form-label" htmlFor="e-method">Method</label>
              <select id="e-method" className="input-field" value={form.paymentMethod} onChange={set('paymentMethod')}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="e-ref">Reference</label>
              <input id="e-ref" className="input-field" placeholder="Invoice or transaction number" value={form.reference} onChange={set('reference')} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setAddOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Save expense'}
            </button>
          </div>
        </form>
      )}

      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <StatGrid>
            <Stat
              label="Collected"
              value={formatCurrency(data.collected)}
              hint={data.refunded > 0 ? `${formatCurrency(data.refunded)} refunded` : 'in this period'}
              tone="success"
              icon={<FaArrowDown />}
            />
            <Stat
              label="Spent"
              value={formatCurrency(data.spent)}
              hint={`${data.expenses.length} entr${data.expenses.length === 1 ? 'y' : 'ies'}`}
              tone="warning"
              icon={<FaArrowUp />}
            />
            <Stat
              label="Net"
              value={formatCurrency(data.net)}
              hint="collection less refunds and expenses"
              tone={data.net >= 0 ? 'primary' : 'danger'}
              icon={<FaBalanceScale />}
            />
            <Stat
              label="Outstanding"
              value={formatCurrency(data.outstanding)}
              hint={`${data.outstandingCount} unpaid bill${data.outstandingCount === 1 ? '' : 's'}, all time`}
              tone={data.outstanding > 0 ? 'danger' : 'muted'}
              icon={<FaExclamationTriangle />}
            />
          </StatGrid>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Collection by method">
              <Split
                rows={Object.entries(data.byMethod).map(([k, v]) => [methodLabel(k), v]).sort((a, b) => b[1] - a[1])}
                total={data.collected}
                empty="Nothing collected in this period."
              />
            </Panel>
            <Panel title="Expenses by category">
              <Split
                rows={Object.entries(data.byCategory).map(([k, v]) => [categoryLabel(k), v]).sort((a, b) => b[1] - a[1])}
                total={data.spent}
                empty="No expenses recorded in this period."
              />
            </Panel>
          </div>

          <FilterTabs
            tabs={[
              { key: 'collection', label: 'Collection', count: data.payments.length },
              { key: 'expenses', label: 'Expenses', count: data.expenses.length },
              { key: 'outstanding', label: 'Outstanding', count: data.outstandingCount },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'collection' && (
            <TableFrame
              head={
                <tr>
                  <th className="px-4 py-3 text-left">When</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Bill</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              }
              empty={data.payments.length === 0}
              emptyIcon="💰"
              emptyText="No payments taken in this period."
            >
              {data.payments.map((p) => (
                <Row key={p.id}>
                  <Td className="whitespace-nowrap text-gray-600">
                    {new Date(p.received_at).toLocaleString()}
                  </Td>
                  <Td className="text-gray-900">{p.booked_tests?.patient_name || '—'}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs text-gray-500">
                    {p.booked_tests?.bill_no || p.booked_tests?.booking_ref || '—'}
                  </Td>
                  <Td className="text-gray-600">{methodLabel(p.method)}</Td>
                  <Td className={`text-right font-semibold tabular-nums ${p.is_refund ? 'text-red-600' : 'text-gray-900'}`}>
                    {p.is_refund ? '− ' : ''}{formatCurrency(p.amount)}
                  </Td>
                </Row>
              ))}
            </TableFrame>
          )}

          {tab === 'expenses' && (
            <TableFrame
              head={
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Paid to</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              }
              empty={data.expenses.length === 0}
              emptyIcon="🧾"
              emptyText="No expenses recorded in this period."
            >
              {data.expenses.map((e) => (
                <Row key={e.id}>
                  <Td className="whitespace-nowrap text-gray-600">{e.spent_on}</Td>
                  <Td>
                    <span className="badge whitespace-nowrap bg-gray-100 text-gray-700">
                      {categoryLabel(e.category)}
                    </span>
                  </Td>
                  <Td className="text-gray-900">
                    {e.description || <span className="text-gray-300">—</span>}
                    {e.reference && <p className="text-xs text-gray-400">{e.reference}</p>}
                  </Td>
                  <Td className="text-gray-600">{e.vendor || '—'}</Td>
                  <Td className="text-right font-semibold tabular-nums text-gray-900">
                    {formatCurrency(e.amount)}
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      className="btn-danger-soft whitespace-nowrap px-2.5 py-1.5 text-xs"
                      onClick={() => setConfirmDelete(e)}
                      aria-label="Delete this expense"
                    >
                      <FaTrash />
                    </button>
                  </Td>
                </Row>
              ))}
            </TableFrame>
          )}

          {tab === 'outstanding' && (
            <TableFrame
              head={
                <tr>
                  <th className="px-4 py-3 text-left">Bill</th>
                  <th className="px-4 py-3 text-left">Patient</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Billed</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-right">Due</th>
                </tr>
              }
              empty={data.owed.length === 0}
              emptyIcon="✅"
              emptyText="Every bill is settled."
              caption="Unpaid bills across all time — an old one is still owed today."
            >
              {data.owed.map((b) => (
                <Row key={b.id}>
                  <Td className="whitespace-nowrap font-mono text-xs text-gray-500">
                    {b.bill_no || b.booking_ref}
                  </Td>
                  <Td className="text-gray-900">
                    {b.patient_name}
                    {b.patient_phone && <p className="text-xs text-gray-400">{b.patient_phone}</p>}
                  </Td>
                  <Td className="whitespace-nowrap text-gray-600">{b.scheduled_date}</Td>
                  <Td className="text-right tabular-nums text-gray-600">{formatCurrency(b.total_amount)}</Td>
                  <Td className="text-right tabular-nums text-gray-600">{formatCurrency(b.amount_paid)}</Td>
                  <Td className="text-right font-bold tabular-nums text-amber-700">
                    {formatCurrency(Math.max(Number(b.total_amount || 0) - Number(b.amount_paid || 0), 0))}
                  </Td>
                </Row>
              ))}
            </TableFrame>
          )}

          <p className="flex items-start gap-2 text-xs text-gray-500">
            <FaFileInvoiceDollar className="mt-0.5 shrink-0 text-gray-300" aria-hidden="true" />
            Collection is the sum of the payments your counter recorded — it is not typed in
            anywhere, so it cannot disagree with the bills.
          </p>
        </>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        danger
        title="Delete this expense?"
        message="It is removed from the day book and from every total on this screen."
        detail={confirmDelete ? `${categoryLabel(confirmDelete.category)} · ${formatCurrency(confirmDelete.amount)}` : ''}
        confirmLabel="Delete expense"
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          await accountingService.removeExpense(confirmDelete.id);
          setConfirmDelete(null);
          await load();
        }}
      />
    </Page>
  );
}
