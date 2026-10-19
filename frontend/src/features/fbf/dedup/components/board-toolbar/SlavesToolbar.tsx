/**
 * SlavesToolbar – Filter toolbar for board column 1 (masters without slaves).
 *
 * Delegates to the reusable ColumnToolbar; wires column-1-only store state
 * (slaveQ / slaveStatus) with debounced search. Shows the card count of the
 * column (filtered total; in similarity mode the display list length
 * respecting the leading column: UC1 = selected + neighbors, UC2 = neighbors).
 * Column 2 has its own independent toolbar filters.
 */

import { useEffect, useState } from 'react';

import { buildSlavesDisplay, useDedupStore } from '@src/features/fbf/dedup/store/dedupStore';
import { useDebounce } from '@src/hooks/useDebounce';

import ColumnToolbar from './ColumnToolbar';

/** Column-1 toolbar: search + status combobox (slaveQ / slaveStatus). */
export default function SlavesToolbar() {
  const slaveStatus = useDedupStore((s) => s.slaveStatus);
  const setSlaveStatus = useDedupStore((s) => s.setSlaveStatus);
  const setSlaveQ = useDedupStore((s) => s.setSlaveQ);
  const slaves = useDedupStore((s) => s.slaves);
  const sp1SelectedItems = useDedupStore((s) => s.sp1SelectedItems);
  const similarSlaves = useDedupStore((s) => s.similarSlaves);
  const sp1Anchor = useDedupStore((s) => s.sp1Anchor);

  const [searchRaw, setSearchRaw] = useState('');
  const debouncedQ = useDebounce(searchRaw);

  useEffect(() => {
    setSlaveQ(debouncedQ);
  }, [debouncedQ, setSlaveQ]);

  const count = similarSlaves !== null
    ? (sp1Anchor !== null
      ? buildSlavesDisplay(sp1SelectedItems, similarSlaves).length
      : similarSlaves.length)
    : slaves?.total;

  return (
    <ColumnToolbar
      searchValue={searchRaw}
      onSearchChange={setSearchRaw}
      status={slaveStatus}
      onStatusChange={setSlaveStatus}
      count={count}
    />
  );
}
