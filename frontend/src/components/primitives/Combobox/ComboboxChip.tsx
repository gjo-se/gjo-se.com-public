import { cn } from '@src/lib/utils';

import { comboboxChipVariants } from './ComboboxChip.variants';

import type { ComboboxChipProps } from './ComboboxChip.interface';
/**
 *
 */
export default function ComboboxChip({ children, ...domProps }: ComboboxChipProps) {
  return <span data-slot="combobox-chip" className={cn(comboboxChipVariants())} {...domProps}>{children}</span>;
}
