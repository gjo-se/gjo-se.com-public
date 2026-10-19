import { cn } from '@src/lib/utils';

import { comboboxChipsVariants } from './ComboboxChips.variants';

import type { ComboboxChipsProps } from './ComboboxChips.interface';
/**
 *
 */
export default function ComboboxChips({ children, ...domProps }: ComboboxChipsProps) {
  return <div data-slot="combobox-chips" className={cn(comboboxChipsVariants())} {...domProps}>{children}</div>;
}
