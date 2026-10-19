import { cn } from '@src/lib/utils';

import { itemMediaVariants } from './ItemMedia.variants';

import type { ItemMediaProps } from './ItemMedia.interface';

/** ItemMedia – Icon, image, or illustration inside an Item. Supports default, icon, and image variants. */
export default function ItemMedia({ variant = 'default', children, ...domProps }: ItemMediaProps) {
  return <div data-slot="item-media" data-variant={variant} className={cn(itemMediaVariants({ variant }))} {...domProps}>{children}</div>;
}
