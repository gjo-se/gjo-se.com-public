import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import Tooltip, { TooltipContent, TooltipTrigger } from '@src/components/primitives/Tooltip';
import { cn } from '@src/lib/utils';

import { sidebarMenuButtonVariants } from './SidebarMenuButton.variants';
import { useSidebar } from './useSidebar';

import type { SidebarMenuButtonProps } from './SidebarMenuButton.interface';

/**
 * SidebarMenuButton – Primary clickable item inside a sidebar menu, with optional tooltip.
 */
export default function SidebarMenuButton({
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  ...domProps
}: SidebarMenuButtonProps) {
  const { isMobile, state } = useSidebar();
  const comp = useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        className: cn(
          sidebarMenuButtonVariants({ variant, size }),
          (domProps as Record<string, unknown>).className as string,
        ),
      },
      domProps as Record<string, unknown>,
    ),
    render: !tooltip ? undefined : <TooltipTrigger />,
    state: {
      slot: 'sidebar-menu-button',
      sidebar: 'menu-button',
      size,
      active: isActive,
    },
  });

  if (!tooltip) {
    return comp;
  }

  const tooltipProps = typeof tooltip === 'string' ? { children: tooltip } : tooltip;

  return (
    <Tooltip>
      {comp}
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== 'collapsed' || isMobile}
        {...tooltipProps}
      />
    </Tooltip>
  );
}
