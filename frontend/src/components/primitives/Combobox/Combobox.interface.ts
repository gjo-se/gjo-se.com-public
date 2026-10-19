import type { ComboboxVariants } from './Combobox.variants';
import type { Combobox as ComboboxPrimitive } from '@base-ui/react';


export interface ComboboxProps<Value = unknown, Multiple extends boolean | undefined = false>
  extends ComboboxVariants,
    ComboboxPrimitive.Root.Props<Value, Multiple> {}
