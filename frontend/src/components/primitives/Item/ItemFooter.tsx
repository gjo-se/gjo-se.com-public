import { cn } from '@src/lib/utils';

import { itemFooterVariants } from './ItemFooter.variants';

import type { ItemFooterProps } from './ItemFooter.interface';

/** ItemFooter – Bottom section of an Item, typically for metadata. */
export default function ItemFooter({ children, ...domProps }: ItemFooterProps) {
  return <div data-slot="item-footer" className={cn(itemFooterVariants())} {...domProps}>{children}</div>;
}
