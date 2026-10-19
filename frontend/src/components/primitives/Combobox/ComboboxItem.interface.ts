import type { ComboboxItemVariants } from './ComboboxItem.variants';
import type { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';


export interface ComboboxItemProps extends ComboboxItemVariants, ComboboxPrimitive.Item.Props {}
