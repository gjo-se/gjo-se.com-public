import { cn } from '@src/lib/utils';

import { markerContentVariants } from './MarkerContent.variants';

import type { MarkerContentProps } from './MarkerContent.interface';

/**
 * MarkerContent – Text content inside a Marker.
 */
export default function MarkerContent({ children, ...domProps }: MarkerContentProps) {
  return (
    <span
      data-slot="marker-content"
      className={cn(markerContentVariants())}
      {...domProps}
    >
      {children}
    </span>
  );
}
