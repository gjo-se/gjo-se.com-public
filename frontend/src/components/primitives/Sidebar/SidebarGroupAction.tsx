import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@src/lib/utils';

import type { SidebarGroupActionProps } from './SidebarGroupAction.interface';

/**
 * SidebarGroupAction – Action button positioned inside a sidebar group header.
 */
export default function SidebarGroupAction({ ...domProps }: SidebarGroupActionProps) {
  return useRender({
    defaultTagName: 'button',
    props: mergeProps<'button'>(
      {
        className: cn(
          'absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0',
          (domProps as Record<string, unknown>).className as string,
        ),
      },
      domProps as Record<string, unknown>,
    ),
    state: {
      slot: 'sidebar-group-action',
      sidebar: 'group-action',
    },
  });
}
