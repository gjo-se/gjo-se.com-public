import type { ComboboxListVariants } from './ComboboxList.variants';
import type { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';


export interface ComboboxListProps
  extends ComboboxListVariants,
    Omit<ComboboxPrimitive.List.Props, 'className' | 'style'> {}
