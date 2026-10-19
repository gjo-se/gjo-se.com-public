import { cn } from '@src/lib/utils';

import { emptyDescriptionVariants } from './EmptyDescription.variants';

import type { EmptyDescriptionProps } from './EmptyDescription.interface';

/**
 * EmptyDescription – Subtext explaining the empty state. Renders a <p> element.
 */
export default function EmptyDescription({ children, ...domProps }: EmptyDescriptionProps) {
  return (
    <p data-slot="empty-description" className={cn(emptyDescriptionVariants())} {...domProps}>
      {children}
    </p>
  );
}
