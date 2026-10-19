import { cn } from '@src/lib/utils';

import { itemDescriptionVariants } from './ItemDescription.variants';

import type { ItemDescriptionProps } from './ItemDescription.interface';

/** ItemDescription – Secondary description text inside an Item. */
export default function ItemDescription({ children, ...domProps }: ItemDescriptionProps) {
  return <p data-slot="item-description" className={cn(itemDescriptionVariants())} {...domProps}>{children}</p>;
}
