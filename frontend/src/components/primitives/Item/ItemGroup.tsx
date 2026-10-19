import { cn } from '@src/lib/utils';

import { itemGroupVariants } from './ItemGroup.variants';

import type { ItemGroupProps } from './ItemGroup.interface';

/** ItemGroup – Vertical list container for Items. Controls gap based on child size. */
export default function ItemGroup({ children, ...domProps }: ItemGroupProps) {
  return <div role="list" data-slot="item-group" className={cn(itemGroupVariants())} {...domProps}>{children}</div>;
}
