import { cn } from '@src/lib/utils';

import { emptyTitleVariants } from './EmptyTitle.variants';

import type { EmptyTitleProps } from './EmptyTitle.interface';

/**
 * EmptyTitle – Primary heading for empty states. Use inside EmptyHeader.
 */
export default function EmptyTitle({ children, ...domProps }: EmptyTitleProps) {
  return (
    <div data-slot="empty-title" className={cn(emptyTitleVariants())} {...domProps}>
      {children}
    </div>
  );
}
