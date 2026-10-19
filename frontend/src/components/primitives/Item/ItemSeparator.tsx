import { Separator } from '@src/components/vendor/shadcn/separator';
import { cn } from '@src/lib/utils';

import { itemSeparatorVariants } from './ItemSeparator.variants';

import type { ItemSeparatorProps } from './ItemSeparator.interface';

/** ItemSeparator – Horizontal divider between Items in a group. */
export default function ItemSeparator({ ...domProps }: ItemSeparatorProps) {
  return <Separator data-slot="item-separator" orientation="horizontal" className={cn(itemSeparatorVariants())} {...domProps} />;
}
