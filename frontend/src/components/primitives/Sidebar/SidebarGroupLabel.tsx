import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@src/lib/utils';

import type { SidebarGroupLabelProps } from './SidebarGroupLabel.interface';

/**
 * SidebarGroupLabel – Label heading for a sidebar group.
 */
export default function SidebarGroupLabel({ ...domProps }: SidebarGroupLabelProps) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(
          'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-all duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
          (domProps as Record<string, unknown>).className as string,
        ),
      },
      domProps as Record<string, unknown>,
    ),
    state: {
      slot: 'sidebar-group-label',
      sidebar: 'group-label',
    },
  });
}
