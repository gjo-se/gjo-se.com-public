import { cn } from '@src/lib/utils';

import type { SidebarGroupProps } from './SidebarGroup.interface';

/**
 * SidebarGroup – Groups related sidebar items together.
 */
export default function SidebarGroup({ children, ...domProps }: SidebarGroupProps) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn('relative flex w-full min-w-0 flex-col p-2', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </div>
  );
}
