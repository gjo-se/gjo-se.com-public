import { cn } from '@src/lib/utils';

import { emptyContentVariants } from './EmptyContent.variants';

import type { EmptyContentProps } from './EmptyContent.interface';

/**
 * EmptyContent – Content area for illustrations, text, or CTAs in empty states.
 */
export default function EmptyContent({ children, ...domProps }: EmptyContentProps) {
  return (
    <div data-slot="empty-content" className={cn(emptyContentVariants())} {...domProps}>
      {children}
    </div>
  );
}
