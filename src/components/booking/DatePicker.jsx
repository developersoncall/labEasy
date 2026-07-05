import { getUpcomingDates } from '../../utils/helpers.js';

/** Horizontal strip of the next N days for slot selection. */
export default function DatePicker({ value, onChange, days = 7 }) {
  const dates = getUpcomingDates(days);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2" role="radiogroup" aria-label="Appointment date">
      {dates.map((d) => {
        const selected = value === d.iso;
        return (
          <button
            key={d.iso}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange?.(d.iso)}
            className={`flex min-w-[72px] flex-col items-center rounded-xl border-2 px-3 py-2.5 transition ${
              selected
                ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
            }`}
          >
            <span className={`text-[11px] font-medium ${selected ? 'text-primary-100' : 'text-gray-400'}`}>
              {d.label}
            </span>
            <span className="text-lg font-bold leading-tight">{d.dayNum}</span>
            <span className={`text-[11px] ${selected ? 'text-primary-100' : 'text-gray-400'}`}>{d.month}</span>
          </button>
        );
      })}
    </div>
  );
}
