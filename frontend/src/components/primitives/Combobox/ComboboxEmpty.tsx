import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';

import { cn } from '@src/lib/utils';

import { comboboxEmptyVariants } from './ComboboxEmpty.variants';

import type { ComboboxEmptyProps } from './ComboboxEmpty.interface';
/**
 *
 */
export default function ComboboxEmpty({ children, ...domProps }: ComboboxEmptyProps) {
  return <ComboboxPrimitive.Empty data-slot="combobox-empty" className={cn(comboboxEmptyVariants())} {...domProps}>{children}</ComboboxPrimitive.Empty>;
}
