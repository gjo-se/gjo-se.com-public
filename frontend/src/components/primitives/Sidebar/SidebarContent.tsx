import { cn } from '@src/lib/utils';

import type { SidebarContentProps } from './SidebarContent.interface';

/**
 * SidebarContent – Scrollable content area of the sidebar.
 */
export default function SidebarContent({ children, ...domProps }: SidebarContentProps) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        'no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
        (domProps as Record<string, unknown>).className as string,
      )}
      {...domProps}
    >
      {children}
    </div>
  );
}
