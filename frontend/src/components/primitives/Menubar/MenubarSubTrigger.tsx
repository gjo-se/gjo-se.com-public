import { DropdownMenuSubTrigger } from '@src/components/vendor/shadcn/dropdown-menu';
import { cn } from '@src/lib/utils';

import { menubarSubTriggerVariants } from './MenubarSubTrigger.variants';

import type { MenubarSubTriggerProps } from './MenubarSubTrigger.interface';

/**
 *
 */
export default function MenubarSubTrigger({ inset, children, ...domProps }: MenubarSubTriggerProps) {
  return <DropdownMenuSubTrigger data-slot="menubar-sub-trigger" data-inset={inset} className={cn(menubarSubTriggerVariants())} {...domProps}>{children}</DropdownMenuSubTrigger>;
}
