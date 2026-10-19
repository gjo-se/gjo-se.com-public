import { DropdownMenu } from '@src/components/vendor/shadcn/dropdown-menu';

import type { MenubarMenuProps } from './MenubarMenu.interface';

/**
 *
 */
export default function MenubarMenu({ children, ...domProps }: MenubarMenuProps) {
  return <DropdownMenu data-slot="menubar-menu" {...domProps}>{children}</DropdownMenu>;
}
