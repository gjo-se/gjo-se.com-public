import { cn } from '@src/lib/utils';

import { overlayVariants } from './Overlay.variants';

import type { OverlayProps } from './Overlay.interface';

/**
 * Overlay – Semi-transparent backdrop with variant support.
 */
export default function Overlay({ variant = 'dialog', children, ...domProps }: OverlayProps) {
  return (
    <div data-slot="overlay" className={cn(overlayVariants({ variant }))} {...domProps}>
      {children}
    </div>
  );
}
