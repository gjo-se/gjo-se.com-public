import { cn } from '@src/lib/utils';

import { itemTitleVariants } from './ItemTitle.variants';

import type { ItemTitleProps } from './ItemTitle.interface';

/** ItemTitle – Primary heading inside an Item. */
export default function ItemTitle({ children, ...domProps }: ItemTitleProps) {
  return <div data-slot="item-title" className={cn(itemTitleVariants())} {...domProps}>{children}</div>;
}
