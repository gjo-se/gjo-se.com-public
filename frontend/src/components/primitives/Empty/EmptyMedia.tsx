import { cn } from '@src/lib/utils';

import { emptyMediaVariants } from './EmptyMedia.variants';

import type { EmptyMediaProps } from './EmptyMedia.interface';

/**
 * EmptyMedia – Illustration or icon for empty states. Supports default and icon variants.
 */
export default function EmptyMedia({ variant = 'default', children, ...domProps }: EmptyMediaProps) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant }))}
      {...domProps}
    >
      {children}
    </div>
  );
}
