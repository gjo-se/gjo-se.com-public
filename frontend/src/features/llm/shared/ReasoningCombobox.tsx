import { useState } from 'react';

import ComboboxOptionsList from '@src/components/molecules/ComboboxOptionsList/ComboboxOptionsList';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';

import { REASONING_OPTIONS } from './reasoningOptions';

// ── Props ──────────────────────────────────────────────────────────────────

interface ReasoningComboboxProps {
  value: string;
  configId: number;
  onSave: (rowId: number, field: string, value: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

/** Inline Combobox for reasoning level – 1:1 pattern from ChangeMasterCombobox. */
export default function ReasoningCombobox({ value, configId, onSave }: ReasoningComboboxProps) {
  const [current, setCurrent] = useState(value);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? REASONING_OPTIONS.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : REASONING_OPTIONS;

  function handleValueChange(newValue: string) {
    if (!newValue || newValue === current) return;
    setCurrent(newValue);
    setSearch('');
    onSave(configId, 'reasoning', newValue);
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Combobox
        {...({
          value: current,
          onValueChange: handleValueChange,
        } as Record<string, unknown>)}
      >
        <ComboboxInput
          placeholder={current}
          value={search}
          onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
        />
        <ComboboxOptionsList
          options={filtered}
          footer={
            filtered.length === 0 && search.trim() ? (
              <ComboboxEmpty>Keine Einträge</ComboboxEmpty>
            ) : null
          }
        />
      </Combobox>
    </div>
  );
}
