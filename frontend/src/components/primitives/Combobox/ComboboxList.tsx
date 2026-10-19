import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';

import { cn } from '@src/lib/utils';

import { comboboxListVariants } from './ComboboxList.variants';

import type { ComboboxListProps } from './ComboboxList.interface';
/**
 *
 */
export default function ComboboxList({ children, ...domProps }: ComboboxListProps) {
  return <ComboboxPrimitive.List data-slot="combobox-list" className={cn(comboboxListVariants())} {...domProps}>{children}</ComboboxPrimitive.List>;
}
