import { cn } from '@src/lib/utils';

import { nativeSelectOptGroupVariants } from './NativeSelectOptGroup.variants';

import type { NativeSelectOptGroupProps } from './NativeSelectOptGroup.interface';

/** NativeSelectOptGroup – Groups options inside a NativeSelect. */
export default function NativeSelectOptGroup({ children, ...domProps }: NativeSelectOptGroupProps) {
  return <optgroup data-slot="native-select-optgroup" className={cn(nativeSelectOptGroupVariants())} {...domProps}>{children}</optgroup>;
}
