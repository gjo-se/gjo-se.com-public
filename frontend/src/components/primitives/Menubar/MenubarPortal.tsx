import { DropdownMenuPortal } from '@src/components/vendor/shadcn/dropdown-menu';

import type { MenubarPortalProps } from './MenubarPortal.interface';

/**
 *
 */
export default function MenubarPortal({ children, ...domProps }: MenubarPortalProps) {
  return <DropdownMenuPortal data-slot="menubar-portal" {...domProps}>{children}</DropdownMenuPortal>;
}
