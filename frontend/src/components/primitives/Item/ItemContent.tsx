import { cn } from '@src/lib/utils';

import { itemContentVariants } from './ItemContent.variants';

import type { ItemContentProps } from './ItemContent.interface';

/** ItemContent – Main content area inside an Item. */
export default function ItemContent({ children, ...domProps }: ItemContentProps) {
  return <div data-slot="item-content" className={cn(itemContentVariants())} {...domProps}>{children}</div>;
}
