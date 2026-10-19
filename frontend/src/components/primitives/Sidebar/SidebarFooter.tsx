import { cn } from '@src/lib/utils';

import type { SidebarFooterProps } from './SidebarFooter.interface';

/**
 * SidebarFooter – Bottom section of the sidebar.
 */
export default function SidebarFooter({ children, ...domProps }: SidebarFooterProps) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn('flex flex-col gap-2 p-2', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </div>
  );
}
