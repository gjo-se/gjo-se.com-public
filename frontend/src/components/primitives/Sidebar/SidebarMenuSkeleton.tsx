import * as React from 'react';

import Skeleton from '@src/components/primitives/Skeleton';
import { cn } from '@src/lib/utils';

import type { SidebarMenuSkeletonProps } from './SidebarMenuSkeleton.interface';

/**
 * SidebarMenuSkeleton – Placeholder skeleton for a sidebar menu item.
 */
export default function SidebarMenuSkeleton({
  children,
  showIcon = false,
  ...domProps
}: SidebarMenuSkeletonProps) {
  const [width] = React.useState(() => `${Math.floor(Math.random() * 40) + 50}%`);

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn('flex h-8 items-center gap-2 rounded-md px-2', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {Boolean(showIcon) && (
        <div data-sidebar="menu-skeleton-icon">
          <Skeleton />
        </div>
      )}
      <div data-sidebar="menu-skeleton-text" style={{ '--skeleton-width': width } as React.CSSProperties}>
        <Skeleton />
      </div>
      {children}
    </div>
  );
}
