import { DropdownMenuLabel } from '@src/components/vendor/shadcn/dropdown-menu';
import { cn } from '@src/lib/utils';

import { menubarLabelVariants } from './MenubarLabel.variants';

import type { MenubarLabelProps } from './MenubarLabel.interface';

/**
 *
 */
export default function MenubarLabel({ inset, children, ...domProps }: MenubarLabelProps) {
  return <DropdownMenuLabel data-slot="menubar-label" data-inset={inset} className={cn(menubarLabelVariants())} {...domProps}>{children}</DropdownMenuLabel>;
}
