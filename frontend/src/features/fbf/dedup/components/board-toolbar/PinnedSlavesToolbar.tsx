/**
 * PinnedSlavesToolbar – Filter toolbar for board column 3 (slaves of the
 * selected master).
 *
 * Delegates to the reusable ColumnToolbar; wires column-3-only store state
 * (pinnedSlavesQ / pinnedSlavesStatus, default all) with debounced search.
 * Shows the card count of the pinned master's alias list (filtered total).
 * Filters apply to the alias list of the currently pinned master.
 */

import { useEffect, useState } from 'react';

import { useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';
import { useDebounce } from '@src/hooks/useDebounce';

import ColumnToolbar from './ColumnToolbar';

/** Column-3 toolbar: search + status combobox (pinnedSlavesQ / pinnedSlavesStatus). */
export default function PinnedSlavesToolbar() {
  const pinnedSlavesStatus = useDedupStore((s) => s.pinnedSlavesStatus);
  const setPinnedSlavesStatus = useDedupStore((s) => s.setPinnedSlavesStatus);
  const setPinnedSlavesQ = useDedupStore((s) => s.setPinnedSlavesQ);
  const pinnedMasterSlaves = useDedupStore((s) => s.pinnedMasterSlaves);

  const [searchRaw, setSearchRaw] = useState('');
  const debouncedQ = useDebounce(searchRaw);

  useEffect(() => {
    setPinnedSlavesQ(debouncedQ);
  }, [debouncedQ, setPinnedSlavesQ]);

  return (
    <ColumnToolbar
      searchValue={searchRaw}
      onSearchChange={setSearchRaw}
      status={pinnedSlavesStatus}
      onStatusChange={setPinnedSlavesStatus}
      count={pinnedMasterSlaves?.total ?? 0}
    />
  );
}
