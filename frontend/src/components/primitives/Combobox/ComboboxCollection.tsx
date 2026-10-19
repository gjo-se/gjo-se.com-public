import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';

import type { ComboboxCollectionProps } from './ComboboxCollection.interface';
/**
 *
 */
export default function ComboboxCollection({ children, ...domProps }: ComboboxCollectionProps) {
  return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...domProps}>{children as never}</ComboboxPrimitive.Collection>;
}
