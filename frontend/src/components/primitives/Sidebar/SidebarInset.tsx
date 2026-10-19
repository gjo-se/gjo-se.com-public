import { cn } from '@src/lib/utils';

import type { SidebarInsetProps } from './SidebarInset.interface';

/**
 * SidebarInset – Main content area that sits alongside the sidebar.
 */
export default function SidebarInset({ children, ...domProps }: SidebarInsetProps) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        'relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
        (domProps as Record<string, unknown>).className as string,
      )}
      {...domProps}
    >
      {children}
    </main>
  );
}
