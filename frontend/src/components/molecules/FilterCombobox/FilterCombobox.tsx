/**
 * FilterCombobox – Reusable searchable combobox for table filter toolbars.
 *
 * Extracted from the Dedup Board ColumnToolbar pattern.
 * Uses Base UI Combobox primitives internally – no manual open/close state.
 *
 * Closed: shows selected label as placeholder in the input.
 * Open: user types to filter the item list.
 * Selection commits and resets the search query.
 * ESC clears the current selection. ✕ button appears only when a value is set.
 */

import { useCallback, useMemo, useState } from 'react';

import ComboboxOptionsList from '@src/components/molecules/ComboboxOptionsList/ComboboxOptionsList';
import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import Button from '@src/components/primitives/Button';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';

import type { KeyboardEvent } from 'react';

interface FilterComboboxProps {
  items: DropdownItem[]
  selectedValue: string
  onSelect: (value: string) => void
  placeholder?: string
  compact?: boolean
}

/** Compact combobox for table filter toolbars – mirrors ColumnToolbar pattern. */
export default function FilterCombobox({
  items,
  selectedValue,
  onSelect,
  placeholder = '\u2013',
  compact = false,
}: FilterComboboxProps) {
  const [query, setQuery] = useState('');

  const selectedLabel = useMemo(
    () => items.find((i) => i.value === selectedValue)?.label ?? placeholder,
    [items, selectedValue, placeholder],
  );

  const filtered = useMemo(
    () =>
      query.trim()
        ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
        : items,
    [items, query],
  );

  const handleChange = useCallback(
    (value: string) => {
      if (!value) return;
      onSelect(value);
      setQuery('');
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    onSelect('');
    setQuery('');
  }, [onSelect]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && selectedValue) {
        e.stopPropagation();
        handleClear();
      }
    },
    [selectedValue, handleClear],
  );

  const hasValue = selectedValue !== '' && selectedValue !== 'all';

  return (
    <div className="flex items-center gap-0 shrink-0">
      <Combobox
        {...({ value: selectedLabel, onValueChange: handleChange } as Record<string, unknown>)}
      >
        <div className={compact ? 'w-14' : 'w-36'}>
          <ComboboxInput
            placeholder={selectedLabel}
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <ComboboxOptionsList
          options={filtered}
          footer={
            filtered.length === 0 && query.trim() ? (
              <ComboboxEmpty>Keine Einträge</ComboboxEmpty>
            ) : null
          }
        />
      </Combobox>
      {hasValue && (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={handleClear}
        title="Filter zurücksetzen"
        aria-label="Filter zurücksetzen"
      >
        ✕
      </Button>
      )}
    </div>
  );
}
