import { cn } from '@src/lib/utils';

import { emptyVariants } from './Empty.variants';

import type { EmptyProps } from './Empty.interface';

/**
 * Empty – Root container for empty state displays. Wraps header, content, and media.
 */
export default function Empty({ children, ...domProps }: EmptyProps) {
  return (
    <div data-slot="empty" className={cn(emptyVariants())} {...domProps}>
      {children}
    </div>
  );
}
