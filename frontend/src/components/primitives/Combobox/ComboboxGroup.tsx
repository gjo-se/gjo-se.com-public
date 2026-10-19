import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';

import type { ComboboxGroupProps } from './ComboboxGroup.interface';
/**
 *
 */
export default function ComboboxGroup({ children, ...domProps }: ComboboxGroupProps) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" {...domProps}>{children}</ComboboxPrimitive.Group>;
}
