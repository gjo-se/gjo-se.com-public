import Separator from '@src/components/primitives/Separator';
import { cn } from '@src/lib/utils';

/**
 * SidebarSeparator – Horizontal divider between sidebar sections.
 */
export default function SidebarSeparator({ ...domProps }: Record<string, unknown>) {
  return (
    <div
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn('mx-2 w-auto bg-sidebar-border', (domProps as Record<string, unknown>).className as string)}
    >
      <Separator {...domProps} />
    </div>
  );
}
