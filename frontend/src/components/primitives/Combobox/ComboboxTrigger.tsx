import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';

import { cn } from '@src/lib/utils';

import { comboboxTriggerVariants } from './ComboboxTrigger.variants';

import type { ComboboxTriggerProps } from './ComboboxTrigger.interface';
/**
 *
 */
export default function ComboboxTrigger({ children, ...domProps }: ComboboxTriggerProps) {
  return <ComboboxPrimitive.Trigger data-slot="combobox-trigger" className={cn(comboboxTriggerVariants())} {...domProps}>{children}</ComboboxPrimitive.Trigger>;
}
