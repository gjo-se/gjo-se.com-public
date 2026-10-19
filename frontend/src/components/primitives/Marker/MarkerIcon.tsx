import { cn } from '@src/lib/utils';

import { markerIconVariants } from './MarkerIcon.variants';

import type { MarkerIconProps } from './MarkerIcon.interface';

/**
 * MarkerIcon – Icon inside a Marker.
 */
export default function MarkerIcon({ children, ...domProps }: MarkerIconProps) {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      className={cn(markerIconVariants())}
      {...domProps}
    >
      {children}
    </span>
  );
}
