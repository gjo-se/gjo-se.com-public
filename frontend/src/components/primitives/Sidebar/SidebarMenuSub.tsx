import { cn } from '@src/lib/utils';

import type { SidebarMenuSubProps } from './SidebarMenuSub.interface';

/**
 * SidebarMenuSub – Nested sub-menu inside a sidebar menu item.
 */
export default function SidebarMenuSub({ children, ...domProps }: SidebarMenuSubProps) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden',
        (domProps as Record<string, unknown>).className as string,
      )}
      {...domProps}
    >
      {children}
    </ul>
  );
}
