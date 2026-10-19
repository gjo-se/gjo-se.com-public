import { cn } from '@src/lib/utils';

import { markerVariants } from './Marker.variants';

import type { MarkerProps } from './Marker.interface';

/**
 * Marker – Inline separator with content, used between sections.
 */
export default function Marker({
  variant = 'default',
  children,
  ...domProps
}: MarkerProps) {
  return (
    <div
      data-slot="marker"
      className={cn(markerVariants({ variant }))}
      {...domProps}
    >
      {children}
    </div>
  );
}
