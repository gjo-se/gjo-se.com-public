import { DropdownMenuTrigger } from '@src/components/vendor/shadcn/dropdown-menu';
import { cn } from '@src/lib/utils';

import { menubarTriggerVariants } from './MenubarTrigger.variants';

import type { MenubarTriggerProps } from './MenubarTrigger.interface';

/**
 *
 */
export default function MenubarTrigger({ children, ...domProps }: MenubarTriggerProps) {
  return <DropdownMenuTrigger data-slot="menubar-trigger" className={cn(menubarTriggerVariants())} {...domProps}>{children}</DropdownMenuTrigger>;
}
