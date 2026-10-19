import { useCallback, useState } from 'react';

import { useTableUrlState } from '@src/components/table/useTableUrlState';
import type { TableParamRegistry } from '@src/components/table/useTableUrlState';
import { type DatePreset, resolveDates } from '@src/lib/formatDate';

/** Manages a date range filter with the URL as SSOT via the shared table owner. */
interface DateFilterActions {
  applyDatePreset: (preset: DatePreset) => void
  applyCustomFrom: (value: string) => void
  applyCustomTo: (value: string) => void
  clearDateFilter: () => void
}

interface DateFilterState {
  datePreset: DatePreset
  dateFrom: string | undefined
  dateTo: string | undefined
}

const FROM_PARAM = 'from';
const TO_PARAM = 'to';

/** Module-level registry (stable reference) for the from/to date URL params. */
const DATE_REGISTRY: TableParamRegistry = {
  [FROM_PARAM]: {
    default: undefined,
    serialize: (value: unknown): string | undefined => (value ? String(value) : undefined),
  },
  [TO_PARAM]: {
    default: undefined,
    serialize: (value: unknown): string | undefined => (value ? String(value) : undefined),
  },
};

/**
 * useDateFilter – Reusable date-filter hook.
 *
 * from/to are owned by useTableUrlState (shared tableKey) and thus part of the
 * URL SSOT and the single localStorage snapshot. The preset label (e.g.
 * "this-week") is not persisted; a restored range is presented as "custom".
 *
 * @example
 * const { state: { datePreset, dateFrom, dateTo }, actions } = useDateFilter('projects')
 */
export function useDateFilter(tableKey: string): {
  state: DateFilterState
  actions: DateFilterActions
} {
  const { params, setParam } = useTableUrlState(tableKey, DATE_REGISTRY);
  const dateFrom = (params[FROM_PARAM] as string | undefined) || undefined;
  const dateTo = (params[TO_PARAM] as string | undefined) || undefined;

  const [datePreset, setDatePreset] = useState<DatePreset>(dateFrom || dateTo ? 'custom' : null);

  const applyDatePreset = useCallback((preset: DatePreset) => {
    const [from, to] = resolveDates(preset);
    setDatePreset(preset);
    setParam(FROM_PARAM, from);
    setParam(TO_PARAM, to);
  }, [setParam]);

  const applyCustomFrom = useCallback((value: string) => {
    setDatePreset('custom');
    setParam(FROM_PARAM, value || undefined);
  }, [setParam]);

  const applyCustomTo = useCallback((value: string) => {
    setDatePreset('custom');
    setParam(TO_PARAM, value || undefined);
  }, [setParam]);

  const clearDateFilter = useCallback(() => {
    setDatePreset(null);
    setParam(FROM_PARAM, undefined);
    setParam(TO_PARAM, undefined);
  }, [setParam]);

  return {
    state: { datePreset, dateFrom, dateTo },
    actions: { applyDatePreset, applyCustomFrom, applyCustomTo, clearDateFilter },
  };
}
