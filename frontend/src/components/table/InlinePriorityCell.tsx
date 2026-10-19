/**
 * InlinePriorityCell – rahmenlose Prioritäts-Zelle mit klickbarem Dropdown.
 *
 * Default zeigt das Label als schlichten Text (wie Frage-/Antwort-Zellen).
 * Klick öffnet ein NativeSelect; die Persistierung erfolgt direkt bei Auswahl
 * via `onChange` (IoC). Geteilt von Proof- und SkillGroup-Tabellen.
 */
import { useCallback, useState } from 'react';

import NativeSelect from '@src/components/primitives/NativeSelect';
import NativeSelectOption from '@src/components/primitives/NativeSelect/NativeSelectOption';

export interface InlinePriorityCellProps {
  /** Current priority value. */
  value: string
  /** Selectable priorities (value + label). */
  options: InlinePriorityOption[]
  /** Persists the newly selected priority. */
  onChange: (value: string) => void
}

export interface InlinePriorityOption {
  value: string
  label: string
}

/** Zelle mit Default-Label (rahmenlos) und klickbarem Dropdown zur Auswahl. */
export default function InlinePriorityCell({ value, options, onChange }: InlinePriorityCellProps) {
  const [editing, setEditing] = useState(false);

  const cancel = useCallback(() => {
    setEditing(false);
  }, []);

  const label = options.find((opt) => opt.value === value)?.label ?? value;

  if (editing) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <NativeSelect
          size="sm"
          autoFocus
          defaultValue={value}
          onChange={(e) => {
            onChange((e.target as HTMLSelectElement).value);
            setEditing(false);
          }}
          onBlur={cancel}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); cancel(); }
          }}
          aria-label="Priorität"
        >
          {options.map((opt) => (
            <NativeSelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true); }
      }}
      className="w-full cursor-pointer rounded px-1 -mx-1 py-0.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      {label}
    </div>
  );
}
