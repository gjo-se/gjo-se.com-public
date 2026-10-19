import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';

import type { ReactNode } from 'react';

export interface ComboboxOption {
  /** Option value as string (numeric ids are stringified by callers). */
  value: string
  /** Human-readable option label. */
  label: string
}

interface ComboboxOptionsListProps {
  /** Options to render as selectable items. */
  options: ComboboxOption[]
  /** Rendered after the option list (clear item, empty hint, …). */
  footer?: ReactNode
}

/** Renders the standard ComboboxContent/List/Item stack for a set of options. */
export default function ComboboxOptionsList({ options, footer }: ComboboxOptionsListProps) {
  return (
    <ComboboxContent>
      <ComboboxList>
        {options.map((opt) => (
          <ComboboxItem key={opt.value} {...({ value: opt.value } as Record<string, unknown>)}>
            {opt.label}
          </ComboboxItem>
        ))}
      </ComboboxList>
      {footer}
    </ComboboxContent>
  );
}
