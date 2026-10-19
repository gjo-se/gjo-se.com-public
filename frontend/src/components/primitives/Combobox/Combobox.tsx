import { Combobox as ComboboxPrimitive } from '@base-ui/react';

import type { ComboboxProps } from './Combobox.interface';

/**
 * Combobox – Searchable select with typing support.
 */
export default function Combobox<
  Value = unknown,
  Multiple extends boolean | undefined = false,
>({ children, ...domProps }: ComboboxProps<Value, Multiple>) {
  return (
    <ComboboxPrimitive.Root data-slot="combobox" {...domProps}>
      {children}
    </ComboboxPrimitive.Root>
  );
}

export { ComboboxPrimitive };
