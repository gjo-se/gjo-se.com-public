import { DropdownMenuRadioGroup } from '@src/components/vendor/shadcn/dropdown-menu';

import type { MenubarRadioGroupProps } from './MenubarRadioGroup.interface';

/**
 *
 */
export default function MenubarRadioGroup({ children, ...domProps }: MenubarRadioGroupProps) {
  return <DropdownMenuRadioGroup data-slot="menubar-radio-group" {...domProps}>{children}</DropdownMenuRadioGroup>;
}
