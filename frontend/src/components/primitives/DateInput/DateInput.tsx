import { Popover } from '@mantine/core';
import { DatePicker as MantineDatePicker } from '@mantine/dates';
import { useCallback, useState } from 'react';

export interface DateInputProps {
  /** ISO date string (YYYY-MM-DD) or empty */
  value: string;
  /** Called with ISO date string (YYYY-MM-DD) when user selects a date */
  onChange: (isoDate: string) => void;
  /** Placeholder text when no date is set */
  placeholder?: string;
}

/**
 * DateInput – Single-date picker with German display format.
 *
 * Default view: German-formatted date (DD.MM.YY) as a button.
 * Click → Mantine DatePicker popover (single date, "de" locale).
 * Select → onChange(ISO string), popover closes.
 */
export default function DateInput({ value, onChange, placeholder }: DateInputProps) {
  const [opened, setOpened] = useState(false);

  const handleSelect = useCallback(
    (date: Date | null | string) => {
      setOpened(false);
      if (!date) return;
      const iso = date instanceof Date
        ? date.toISOString().split('T')[0]
        : String(date).split('T')[0];
      onChange(iso);
    },
    [onChange],
  );

  const display = formatGerman(value);

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom-start" shadow="md">
      <Popover.Target>
        <button
          type="button"
          className={`w-full cursor-pointer rounded px-1 -mx-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 min-h-7 ${!display ? 'text-on-surface-muted' : ''}`}
          onClick={() => setOpened((o) => !o)}
        >
          {display || placeholder || '\u2013'}
        </button>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <MantineDatePicker
          value={value ? new Date(value) : null}
          onChange={handleSelect}
          locale="de"
        />
      </Popover.Dropdown>
    </Popover>
  );
}

/** Formats an ISO date (YYYY-MM-DD) to German display format (DD.MM.YY). */
function formatGerman(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  const yy = y.slice(2);
  return `${d}.${m}.${yy}`;
}
