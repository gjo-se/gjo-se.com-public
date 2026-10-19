/**
 * DateRangeFilter – Shared date-range filter for server-side tables.
 *
 * Owns the from/to URL state via useDateFilter(tableKey) and renders the
 * DatePicker with the identical presets/wiring everywhere. The table hook reads
 * the same from/to values through useDateFilter(tableKey) and syncs via the
 * shared "tablestatechange" event, so the filter looks and behaves the same on
 * every table that mounts it.
 */

import DatePicker from '@src/components/primitives/DatePicker/DatePicker';
import { useDateFilter } from '@src/hooks/useDateFilter';
import type { DatePreset } from '@src/lib/formatDate';

export interface DateRangeFilterProps {
  /** Table key so the filter shares the table's URL state (from/to params). */
  tableKey: string
}

/** Renders the shared from/to date-range filter bound to a table's URL state. */
export default function DateRangeFilter({ tableKey }: DateRangeFilterProps) {
  const { state: { dateFrom, dateTo }, actions } = useDateFilter(tableKey);
  const { applyDatePreset, applyCustomFrom, applyCustomTo, clearDateFilter } = actions;

  return (
    <DatePicker
      from={dateFrom ?? undefined}
      to={dateTo ?? undefined}
      onFromChange={applyCustomFrom}
      onToChange={applyCustomTo}
      onPreset={(preset: string) => applyDatePreset(preset as DatePreset)}
      onClear={clearDateFilter}
    />
  );
}
