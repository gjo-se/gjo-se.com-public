import { cn } from '@src/lib/utils';

import type { SidebarGroupContentProps } from './SidebarGroupContent.interface';

/**
 * SidebarGroupContent – Content wrapper inside a sidebar group.
 */
export default function SidebarGroupContent({ children, ...domProps }: SidebarGroupContentProps) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn('w-full text-sm', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </div>
  );
}
