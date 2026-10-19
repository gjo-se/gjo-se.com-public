import { useEffect, useState } from 'react';

import Dropdown, { type DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import Text from '@src/components/primitives/Text';
import type { CoreStatusOut } from '@src/lib/api/coreCatalog';
import { fetchStatusesOnce, getCachedStatuses, hasCachedStatuses } from '@src/providers/statusCatalog/statusCache';

export interface StatusFilterProps {
  /** The statusable type to scope the filter to (e.g. "fbf_skill"). */
  statusableType: string;
  /** Currently selected status name, or "" for "all". */
  selectedValue: string;
  /** Called when the user selects a status. Receives the status name, or "all". */
  onSelect: (value: string) => void;
}

/**
 * Generic status filter dropdown for any statusable entity.
 *
 * Fetches scoped statuses once per type (cached globally via statusCache),
 * renders a compact labeled dropdown with "Alle" + status options.
 *
 * @example
 * // In a table toolbar filter:
 * createElement(StatusFilter, {
 *   statusableType: 'fbf_skill',
 *   selectedValue: statusFilter,
 *   onSelect: handleStatusFilterChange,
 * })
 */
export default function StatusFilter({ statusableType, selectedValue, onSelect }: StatusFilterProps) {
  const [statuses, setStatuses] = useState<CoreStatusOut[]>(() => getCachedStatuses(statusableType) ?? []);

  useEffect(() => {
    if (hasCachedStatuses(statusableType)) return;
    fetchStatusesOnce(statusableType).then(setStatuses);
  }, [statusableType]);

  const items: DropdownItem[] = [
    { value: 'all', label: 'Alle' },
    ...statuses.map((s) => ({ value: s.name, label: s.name })),
  ];

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Text as="span" size="xs" color="secondary">Status:</Text>
      <Dropdown
        items={items}
        selectedValue={selectedValue || 'all'}
        onSelect={onSelect}
      />
    </div>
  );
}
