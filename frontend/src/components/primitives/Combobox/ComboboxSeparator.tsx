import { cn } from '@src/lib/utils';

import { comboboxSeparatorVariants } from './ComboboxSeparator.variants';

import type { ComboboxSeparatorProps } from './ComboboxSeparator.interface';
/**
 *
 */
export default function ComboboxSeparator({ ...domProps }: ComboboxSeparatorProps) {
  return <div data-slot="combobox-separator" className={cn(comboboxSeparatorVariants())} {...domProps} />;
}
