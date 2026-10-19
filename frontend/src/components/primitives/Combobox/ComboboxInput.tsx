import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';

import { cn } from '@src/lib/utils';

import { comboboxInputVariants } from './ComboboxInput.variants';

import type { ComboboxInputProps } from './ComboboxInput.interface';
/**
 *
 */
export default function ComboboxInput({ ...domProps }: ComboboxInputProps) {
  return <ComboboxPrimitive.Input data-slot="combobox-input" className={cn(comboboxInputVariants())} {...domProps} />;
}
