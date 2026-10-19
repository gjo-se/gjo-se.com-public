import { cn } from '@src/lib/utils';

import type { SidebarMenuSubItemProps } from './SidebarMenuSubItem.interface';

/**
 * SidebarMenuSubItem – Single list item inside a sub-menu.
 */
export default function SidebarMenuSubItem({ children, ...domProps }: SidebarMenuSubItemProps) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn('group/menu-sub-item relative', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </li>
  );
}
