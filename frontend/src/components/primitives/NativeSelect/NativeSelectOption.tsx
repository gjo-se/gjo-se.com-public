import { cn } from '@src/lib/utils';

import { nativeSelectOptionVariants } from './NativeSelectOption.variants';

import type { NativeSelectOptionProps } from './NativeSelectOption.interface';

/** NativeSelectOption – Single option inside a NativeSelect or NativeSelectOptGroup. */
export default function NativeSelectOption({ children, ...domProps }: NativeSelectOptionProps) {
  return <option data-slot="native-select-option" className={cn(nativeSelectOptionVariants())} {...domProps}>{children}</option>;
}
