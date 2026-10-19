/**
 * useClientTableState – gemeinsamer URL-State-Preamble für client-seitige
 * Tabellen-Hooks.
 *
 * Kapselt `useTableUrlState(tableKey)` plus den wiederholten
 * `handleSearchChange` (Suchwechsel setzt page auf 0). Feature-Hooks
 * destrukturieren nur noch den State.
 */

import { useCallback } from 'react';

import { useTableUrlState } from '@src/components/table/useTableUrlState';
import type { TableParamRegistry } from '@src/components/table/useTableUrlState';

/** Returns URL-synced table state plus a search-change handler. */
export function useClientTableState(tableKey: string, registry?: TableParamRegistry) {
  const { q, page, size, sort, order, setQ, setPage, setSize, setSort, resetUrlState } =
    useTableUrlState(tableKey, registry);

  const handleSearchChange = useCallback(
    (value: string) => {
      setQ(value);
      setPage(0);
    },
    [setQ, setPage],
  );

  return { q, page, size, sort, order, setQ, setPage, setSize, setSort, handleSearchChange, resetUrlState };
}
