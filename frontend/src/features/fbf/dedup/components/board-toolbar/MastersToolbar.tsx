/**
 * MastersToolbar – Filter toolbar for board column 2 (masters with slaves).
 *
 * Delegates to the reusable ColumnToolbar; wires the shared ``filters``
 * store state (q / status) with debounced search. Shows the card count of
 * the column (filtered total; in similarity mode the display list length
 * respecting the leading column: UC2 = selected + ranked, UC1 = ranked only).
 * Sorting was removed – the column always sorts by name (or similarity).
 * Column 1 has its own slaveQ/slaveStatus.
 */

import { useEffect, useState } from 'react';

import {
  buildMastersDisplay,
  useDedupStore,
} from '@src/features/fbf/dedup/store/dedupStore';
import { useDebounce } from '@src/hooks/useDebounce';

import ColumnToolbar from './ColumnToolbar';

/** Column-2 toolbar: search + status combobox (shared filters state). */
export default function MastersToolbar() {
  const filters = useDedupStore((s) => s.filters);
  const setFilter = useDedupStore((s) => s.setFilter);
  const masters = useDedupStore((s) => s.masters);
  const similarMasters = useDedupStore((s) => s.similarMasters);
  const sp2SelectedItems = useDedupStore((s) => s.sp2SelectedItems);
  const sp2Anchor = useDedupStore((s) => s.sp2Anchor);

  const [searchRaw, setSearchRaw] = useState(filters.q);
  const debouncedQ = useDebounce(searchRaw);

  useEffect(() => {
    setFilter({ q: debouncedQ });
  }, [debouncedQ, setFilter]);

  const count = similarMasters !== null
    ? (sp2Anchor !== null
      ? buildMastersDisplay(sp2SelectedItems, similarMasters).length
      : similarMasters.length)
    : masters?.total;

  return (
    <ColumnToolbar
      searchValue={searchRaw}
      onSearchChange={setSearchRaw}
      status={filters.status}
      onStatusChange={(status) => setFilter({ status })}
      count={count}
    />
  );
}
