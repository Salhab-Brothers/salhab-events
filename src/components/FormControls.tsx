import { BOOKABLE_SLOTS, type CanonicalSlot } from '@/lib/data';

/** Time slot choice: four equal buttons that stay one row from the smallest phone up. */
export function SlotPicker({ value, onChange, labelId }: {
  value: string;
  onChange: (slot: CanonicalSlot) => void;
  labelId: string;
}) {
  return (
    <div role="group" aria-labelledby={labelId} className="grid grid-cols-4 gap-2">
      {BOOKABLE_SLOTS.map(s => (
        <button
          key={s.value}
          type="button"
          aria-pressed={value === s.value}
          onClick={() => onChange(s.value)}
          className={`min-h-11 rounded-lg border px-1 py-2 text-xs font-body font-medium leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9
            ${value === s.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** "Book the diwan too": the whole row is the tap target, not just the small box. */
export function DiwanCheckbox({ id, checked, onChange, hint }: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer select-none items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-primary"
      />
      <span className="font-body text-sm">
        <span className="block font-medium">✅ احجز الديوان</span>
        <span className="block text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
