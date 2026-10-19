/**
 * ColumnToolbar – Shared single-row toolbar for the dedup board columns.
 *
 * Layout: search input (type="search": native clear button, Escape clears)
 * next to a status combobox (all / pending / active / inactive / rejected /
 * deprecated, MasterDropdown pattern: searchable popup list, active status
 * shown as placeholder, "all" maps to an empty status filter) and an optional
 * card count chip (visible cards of the column under the current filters).
 * Fully controlled – each column wires its own store state.
 */

import React, { useCallback, useState } from 'react';

import Chip from '@src/components/primitives/Chip';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';
import Icon from '@src/components/primitives/Icon/Icon';
import Input from '@src/components/primitives/Input';

import { STATUS_OPTIONS } from '../../utils/columnToolbar';

interface ColumnToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (status: string) => void
  /** Number of cards in the column (under the current filters). */
  count?: number
}

/** Single-row column toolbar: search input, status combobox, card count. */
export default function ColumnToolbar({
  searchValue, onSearchChange, status, onStatusChange, count,
}: ColumnToolbarProps) {
  const [statusQuery, setStatusQuery] = useState('');

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value),
    [onSearchChange],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') onSearchChange('');
    },
    [onSearchChange],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      if (!value) return;
      onStatusChange(value === 'all' ? '' : value);
      setStatusQuery('');
    },
    [onStatusChange],
  );

  const activeStatusLabel = status === '' ? 'all' : status;
  const filteredOptions = statusQuery.trim()
    ? STATUS_OPTIONS.filter((opt) => opt.label.includes(statusQuery.toLowerCase()))
    : STATUS_OPTIONS;

  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 overflow-hidden">
        <Input
          type="search"
          placeholder="Suche…"
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          leftIcon={<Icon name="search" />}
        />
      </div>
      <div className="basis-40 shrink-0">
        <Combobox
          {...({
            value: activeStatusLabel,
            onValueChange: handleStatusChange,
          } as Record<string, unknown>)}
        >
          <ComboboxInput
            placeholder={activeStatusLabel}
            value={statusQuery}
            onChange={(e) => setStatusQuery((e.target as HTMLInputElement).value)}
          />
          <ComboboxContent>
            <ComboboxList>
              {filteredOptions.map((opt) => (
                <ComboboxItem
                  key={opt.label}
                  {...({ value: opt.value === '' ? 'all' : opt.value } as Record<string, unknown>)}
                >
                  {opt.label}
                </ComboboxItem>
              ))}
            </ComboboxList>
            {filteredOptions.length === 0 && statusQuery.trim() ? (
              <ComboboxEmpty>Kein Status</ComboboxEmpty>
            ) : null}
          </ComboboxContent>
        </Combobox>
      </div>
      {count !== undefined && (
        <div className="shrink-0 self-center">
          <Chip variant="muted" size="sm">{count}</Chip>
        </div>
      )}
    </div>
  );
}
