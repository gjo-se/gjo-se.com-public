import { cn } from '@src/lib/utils';

import { itemHeaderVariants } from './ItemHeader.variants';

import type { ItemHeaderProps } from './ItemHeader.interface';

/** ItemHeader – Top section of an Item, typically for title and actions. */
export default function ItemHeader({ children, ...domProps }: ItemHeaderProps) {
  return <div data-slot="item-header" className={cn(itemHeaderVariants())} {...domProps}>{children}</div>;
}
