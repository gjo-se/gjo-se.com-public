import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';

import { cn } from '@src/lib/utils';

import { comboboxContentVariants } from './ComboboxContent.variants';

import type { ComboboxContentProps } from './ComboboxContent.interface';
/**
 *
 */
export default function ComboboxContent({ children, ...domProps }: ComboboxContentProps) {
  return <ComboboxPrimitive.Portal><ComboboxPrimitive.Positioner><ComboboxPrimitive.Popup data-slot="combobox-content" className={cn(comboboxContentVariants())} {...domProps}>{children}</ComboboxPrimitive.Popup></ComboboxPrimitive.Positioner></ComboboxPrimitive.Portal>;
}
