import { cn } from '@src/lib/utils';

import { drawerFooterVariants } from './DrawerFooter.variants';

import type { DrawerFooterProps } from './DrawerFooter.interface';

/**
 * DrawerFooter – Bottom section for action buttons inside a DrawerContent.
 */
export default function DrawerFooter({ children, ...domProps }: DrawerFooterProps) {
  return <div data-slot="drawer-footer" className={cn(drawerFooterVariants())} {...domProps}>{children}</div>;
}
