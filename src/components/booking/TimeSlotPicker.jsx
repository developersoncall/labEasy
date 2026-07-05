import { TIME_SLOT_GROUPS } from '../../constants/index.js';

const GROUP_LABELS = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };

/** Grouped time-slot grid (morning / afternoon / evening). */
export default function TimeSlotPicker({ value, onChange }) {
  return (
    <div className="space-y-4">
      {Object.entries(TIME_SLOT_GROUPS).map(([group, slots]) => (
        <div key={group}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {GROUP_LABELS[group]}
          </p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`${GROUP_LABELS[group]} slots`}>
            {slots.map((slot) => {
              const selected = value === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange?.(slot)}
                  className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition ${
                    selected
                      ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-primary-400 hover:text-primary-600'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
