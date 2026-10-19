import { DropdownMenuGroup } from '@src/components/vendor/shadcn/dropdown-menu';

import type { MenubarGroupProps } from './MenubarGroup.interface';

/**
 *
 */
export default function MenubarGroup({ children, ...domProps }: MenubarGroupProps) {
  return <DropdownMenuGroup data-slot="menubar-group" {...domProps}>{children}</DropdownMenuGroup>;
}
