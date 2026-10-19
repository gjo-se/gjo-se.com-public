import Button from '@src/components/primitives/Button';
import Icon from '@src/components/primitives/Icon';

import { useSidebar } from './useSidebar';

import type { SidebarTriggerProps } from './SidebarTrigger.interface';

/**
 * SidebarTrigger – Button that toggles the sidebar open/closed.
 */
export default function SidebarTrigger({ children, ...domProps }: SidebarTriggerProps) {
  const { toggleSidebar } = useSidebar();
  const onClick =
    (domProps as Record<string, unknown>).onClick as
      | ((event: React.MouseEvent<HTMLButtonElement>) => void)
      | undefined;

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        toggleSidebar();
      }}
    >
      <Icon name="panel-left" aria-hidden />
      <span className="sr-only">Toggle Sidebar</span>
      {children}
    </Button>
  );
}
