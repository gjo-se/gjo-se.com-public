import { DropdownMenuContent } from '@src/components/vendor/shadcn/dropdown-menu';
import { cn } from '@src/lib/utils';

import { menubarContentVariants } from './MenubarContent.variants';

import type { MenubarContentProps } from './MenubarContent.interface';

/**
 *
 */
export default function MenubarContent({ align = 'start', alignOffset = -4, sideOffset = 8, children, ...domProps }: MenubarContentProps) {
  return <DropdownMenuContent data-slot="menubar-content" align={align} alignOffset={alignOffset} sideOffset={sideOffset} className={cn(menubarContentVariants())} {...domProps}>{children}</DropdownMenuContent>;
}
