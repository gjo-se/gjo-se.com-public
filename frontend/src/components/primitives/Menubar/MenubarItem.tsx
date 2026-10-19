import { DropdownMenuItem } from '@src/components/vendor/shadcn/dropdown-menu';
import { cn } from '@src/lib/utils';

import { menubarItemVariants } from './MenubarItem.variants';

import type { MenubarItemProps } from './MenubarItem.interface';

/**
 *
 */
export default function MenubarItem({ inset, variant = 'default', children, ...domProps }: MenubarItemProps) {
  return <DropdownMenuItem data-slot="menubar-item" data-inset={inset} data-variant={variant} className={cn(menubarItemVariants())} {...domProps}>{children}</DropdownMenuItem>;
}
