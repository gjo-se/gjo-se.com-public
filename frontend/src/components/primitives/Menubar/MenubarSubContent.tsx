import { DropdownMenuSubContent } from '@src/components/vendor/shadcn/dropdown-menu';
import { cn } from '@src/lib/utils';

import { menubarSubContentVariants } from './MenubarSubContent.variants';

import type { MenubarSubContentProps } from './MenubarSubContent.interface';

/**
 *
 */
export default function MenubarSubContent({ children, ...domProps }: MenubarSubContentProps) {
  return <DropdownMenuSubContent data-slot="menubar-sub-content" className={cn(menubarSubContentVariants())} {...domProps}>{children}</DropdownMenuSubContent>;
}
