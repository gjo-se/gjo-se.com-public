import { DropdownMenuSeparator } from '@src/components/vendor/shadcn/dropdown-menu';
import { cn } from '@src/lib/utils';

import { menubarSeparatorVariants } from './MenubarSeparator.variants';

import type { MenubarSeparatorProps } from './MenubarSeparator.interface';

/**
 *
 */
export default function MenubarSeparator({ ...domProps }: MenubarSeparatorProps) {
  return <DropdownMenuSeparator data-slot="menubar-separator" className={cn(menubarSeparatorVariants())} {...domProps} />;
}
