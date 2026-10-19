import { cn } from '@src/lib/utils';

import type { SidebarHeaderProps } from './SidebarHeader.interface';

/**
 * SidebarHeader – Top section of the sidebar.
 */
export default function SidebarHeader({ children, ...domProps }: SidebarHeaderProps) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn('flex flex-col gap-2 p-2', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </div>
  );
}
