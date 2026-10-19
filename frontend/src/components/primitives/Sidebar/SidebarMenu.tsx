import { cn } from '@src/lib/utils';

import type { SidebarMenuProps } from './SidebarMenu.interface';

/**
 * SidebarMenu – Unordered list wrapper for sidebar menu items.
 */
export default function SidebarMenu({ children, ...domProps }: SidebarMenuProps) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn('flex w-full min-w-0 flex-col gap-1', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </ul>
  );
}
