import { cn } from '@src/lib/utils';

import { comboboxLabelVariants } from './ComboboxLabel.variants';

import type { ComboboxLabelProps } from './ComboboxLabel.interface';
/**
 *
 */
export default function ComboboxLabel({ children, ...domProps }: ComboboxLabelProps) {
  return <div data-slot="combobox-label" className={cn(comboboxLabelVariants())} {...domProps}>{children}</div>;
}
