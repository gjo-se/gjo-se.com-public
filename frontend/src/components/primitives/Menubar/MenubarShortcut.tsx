import { DropdownMenuShortcut } from '@src/components/vendor/shadcn/dropdown-menu';
import { cn } from '@src/lib/utils';

import { menubarShortcutVariants } from './MenubarShortcut.variants';

import type { MenubarShortcutProps } from './MenubarShortcut.interface';

/**
 *
 */
export default function MenubarShortcut({ children, ...domProps }: MenubarShortcutProps) {
  return <DropdownMenuShortcut data-slot="menubar-shortcut" className={cn(menubarShortcutVariants())} {...domProps}>{children}</DropdownMenuShortcut>;
}
