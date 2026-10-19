import { cn } from '@src/lib/utils';

import { comboboxValueVariants } from './ComboboxValue.variants';

import type { ComboboxValueProps } from './ComboboxValue.interface';
/**
 *
 */
export default function ComboboxValue({ children, ...domProps }: ComboboxValueProps) {
  return <span data-slot="combobox-value" className={cn(comboboxValueVariants())} {...domProps}>{children}</span>;
}
