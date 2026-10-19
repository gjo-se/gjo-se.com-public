import { useState } from 'react';

import ComboboxOptionsList from '@src/components/molecules/ComboboxOptionsList/ComboboxOptionsList';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import Text from '@src/components/primitives/Text';


import type { SelectComboboxProps } from './SelectCombobox.interface';

/**
 * SelectCombobox – searchable combobox that commits a numeric value (or null).
 *
 * Shared basis for the FBF skill score/group cells: renders the option list,
 * filters by the typed query and commits `number | null` on selection. The
 * click-to-edit cells reuse it with `autoFocus`/`onEscape`; the always-open
 * cells reuse it with `allowClear`.
 */
export default function SelectCombobox({
  options,
  value,
  onCommit,
  allowClear = false,
  clearLabel = 'Keinen Wert setzen',
  placeholder,
  autoFocus = false,
  onBlur,
  onEscape,
}: SelectComboboxProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const currentLabel =
    value != null ? (options.find((o) => o.value === String(value))?.label ?? null) : null;

  const filtered = searchQuery.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const handleChange = (next: string) => {
    onCommit(next ? Number(next) : null);
    setSearchQuery('');
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Combobox
        {...({ value: currentLabel ?? '', onValueChange: handleChange } as Record<string, unknown>)}
      >
        <ComboboxInput
          autoFocus={autoFocus}
          placeholder={placeholder ?? currentLabel ?? '–'}
          value={searchQuery}
          onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onEscape?.();
          }}
        />
        <ComboboxOptionsList
          options={filtered}
          footer={
            allowClear ? (
              <ComboboxItem {...({ value: '' } as Record<string, unknown>)}>
                <Text as="span" size="xs" color="muted">{clearLabel}</Text>
              </ComboboxItem>
            ) : null
          }
        />
      </Combobox>
    </div>
  );
}

export type { SelectComboboxProps } from './SelectCombobox.interface';
export type { SelectComboboxOption } from './SelectCombobox.types';
