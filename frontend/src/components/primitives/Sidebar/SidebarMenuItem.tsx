import { cn } from '@src/lib/utils';

import type { SidebarMenuItemProps } from './SidebarMenuItem.interface';

/**
 * SidebarMenuItem – Single list item inside a sidebar menu.
 */
export default function SidebarMenuItem({ children, ...domProps }: SidebarMenuItemProps) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn('group/menu-item relative', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </li>
  );
}
