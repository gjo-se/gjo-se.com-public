import { DropdownMenuSub } from '@src/components/vendor/shadcn/dropdown-menu';

import type { MenubarSubProps } from './MenubarSub.interface';

/**
 *
 */
export default function MenubarSub({ children, ...domProps }: MenubarSubProps) {
  return <DropdownMenuSub data-slot="menubar-sub" {...domProps}>{children}</DropdownMenuSub>;
}
