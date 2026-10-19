import Input from '@src/components/primitives/Input';
import { cn } from '@src/lib/utils';

/**
 * SidebarInput – Search input field inside the sidebar.
 */
export default function SidebarInput({ ...domProps }: Record<string, unknown>) {
  return (
    <div
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn('h-8 w-full bg-background shadow-none', (domProps as Record<string, unknown>).className as string)}
    >
      <Input {...domProps} />
    </div>
  );
}
