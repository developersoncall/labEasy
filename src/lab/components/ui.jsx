import { Link } from 'react-router-dom';
import { STATUS_LABELS, STATUS_STYLES, stageProgress } from '../../services/labBookingService.js';

/**
 * The Lab Dashboard's small design system.
 *
 * One file so every screen agrees on rhythm: pages stack on a 24px gap,
 * cards are rounded-2xl with a hairline border, tables breathe at 20px
 * horizontal / 14px vertical, and section headers all sit at the same size.
 * Screens compose these instead of re-inventing paddings each time.
 */

/* ---------------------------------------------------------------- layout -- */

/** Standard page wrapper — every lab screen starts with this. */
export function Page({ children }) {
  return <div className="space-y-6 pb-10">{children}</div>;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200/80 pb-5">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** A titled block — used for anything that isn't the page's main table. */
export function Section({ title, description, action, children }) {
  return (
    <section className="space-y-3">
      {(title || action) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-bold text-gray-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- feedback -- */

export function Alert({ tone = 'error', children, onDismiss }) {
  const tones = {
    error: 'border-red-100 bg-red-50 text-red-700',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    info: 'border-primary-100 bg-primary-50 text-primary-900',
    warning: 'border-amber-100 bg-amber-50 text-amber-800',
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`} role="alert">
      <span className="min-w-0 flex-1">{children}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- pills -- */

export function StatusPill({ status }) {
  return (
    <span className={`badge whitespace-nowrap ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PaymentPill({ status }) {
  const map = {
    paid: ['bg-emerald-100 text-emerald-700', 'Paid'],
    partial: ['bg-amber-100 text-amber-800', 'Partial'],
    refunded: ['bg-slate-100 text-slate-600', 'Refunded'],
    waived: ['bg-slate-100 text-slate-600', 'Waived'],
  };
  const [tone, label] = map[status] || ['bg-red-100 text-red-700', 'Unpaid'];
  return <span className={`badge whitespace-nowrap ${tone}`}>{label}</span>;
}

export function Progress({ status }) {
  const pct = stageProgress(status);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${status === 'cancelled' ? 'bg-red-400' : 'bg-primary-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-[11px] tabular-nums text-gray-400">{pct}%</span>
    </div>
  );
}

/* ----------------------------------------------------------------- stat -- */

export function Stat({ label, value, hint, tone = 'primary', icon, to }) {
  // Colour names and meaning names both resolve here, so a screen can say
  // what a number *is* ("warning") without knowing which hue that maps to.
  const tones = {
    primary: 'bg-primary-50 text-primary-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    slate: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-rose-50 text-rose-600',
    muted: 'bg-slate-100 text-slate-600',
  };

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{label}</p>
        {icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${tones[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 text-[28px] font-bold leading-none tabular-nums text-gray-900">{value}</p>
      {hint && <p className="mt-2 text-xs text-gray-400">{hint}</p>}
    </>
  );

  const shell =
    'block rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

  // A tile with a destination becomes the shortest route to that queue.
  if (to) {
    return (
      <Link
        to={to}
        className={`${shell} group transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500`}
      >
        {inner}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 opacity-0 transition group-hover:opacity-100">
          Open →
        </span>
      </Link>
    );
  }

  return <Card className="p-5">{inner}</Card>;
}

export function StatGrid({ children }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

/* --------------------------------------------------------------- filters -- */

/** The pill row every list screen uses to switch views. */
export function FilterTabs({ tabs, active, onChange, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
            active === t.key
              ? 'bg-primary-600 text-white shadow-sm'
              : 'border border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:text-primary-700'
          }`}
        >
          {t.label}
          {t.count > 0 && (
            <span
              className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                active === t.key ? 'bg-white/25' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…', label = 'Search' }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400" aria-hidden="true">
        🔍
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="input-field h-11 w-full pl-10 sm:w-64"
      />
    </div>
  );
}

/* ---------------------------------------------------------------- table -- */

export function TableFrame({ head, children, empty, emptyIcon = '📋', emptyText = 'Nothing here yet.', caption }) {
  return (
    <Card className="overflow-hidden">
      {caption && (
        <div className="border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {caption}
        </div>
      )}
      {empty ? (
        <div className="px-5 py-16 text-center">
          <div className="text-3xl" aria-hidden="true">{emptyIcon}</div>
          <p className="mt-3 text-sm text-gray-500">{emptyText}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                {head.map((h) => (
                  <th
                    key={h.label ?? h}
                    className={`whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500 ${
                      h.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {h.label ?? h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">{children}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Consistent cell padding — every lab table row uses this. */
export function Td({ className = '', children, ...rest }) {
  return (
    <td className={`px-5 py-4 align-middle ${className}`} {...rest}>
      {children}
    </td>
  );
}

export function Row({ children }) {
  return <tr className="transition-colors hover:bg-primary-50/30">{children}</tr>;
}

/** Booking identity cell — reference + patient, used in every list. */
export function PatientCell({ booking }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-gray-900">{booking.patient_name || 'Walk-in patient'}</p>
      <p className="mt-0.5 truncate font-mono text-xs text-gray-400">
        {booking.booking_ref || booking.id.slice(0, 8)}
        {booking.patient_phone ? ` · ${booking.patient_phone}` : ''}
      </p>
    </div>
  );
}

/** The tests on a booking — `items` is jsonb written by every booking path. */
export function itemsLabel(items) {
  if (!Array.isArray(items) || !items.length) return '—';
  return items.map((i) => i.name || i.title || i.test_name || 'Test').join(', ');
}
