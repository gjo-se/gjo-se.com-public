import { cn } from '@src/lib/utils';

import { itemActionsVariants } from './ItemActions.variants';

import type { ItemActionsProps } from './ItemActions.interface';

/** ItemActions – Action buttons area inside an Item. */
export default function ItemActions({ children, ...domProps }: ItemActionsProps) {
  return <div data-slot="item-actions" className={cn(itemActionsVariants())} {...domProps}>{children}</div>;
}
