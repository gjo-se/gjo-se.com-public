import { cn } from '@src/lib/utils';

import { comboboxChipsInputVariants } from './ComboboxChipsInput.variants';

import type { ComboboxChipsInputProps } from './ComboboxChipsInput.interface';
/**
 *
 */
export default function ComboboxChipsInput({ ...domProps }: ComboboxChipsInputProps) {
  return <input data-slot="combobox-chips-input" className={cn(comboboxChipsInputVariants())} {...domProps} />;
}
