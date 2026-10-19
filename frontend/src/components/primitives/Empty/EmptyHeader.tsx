import { cn } from '@src/lib/utils';

import { emptyHeaderVariants } from './EmptyHeader.variants';

import type { EmptyHeaderProps } from './EmptyHeader.interface';

/**
 * EmptyHeader – Title and description container for empty states.
 */
export default function EmptyHeader({ children, ...domProps }: EmptyHeaderProps) {
  return <div data-slot="empty-header" className={cn(emptyHeaderVariants())} {...domProps}>{children}</div>;
}
