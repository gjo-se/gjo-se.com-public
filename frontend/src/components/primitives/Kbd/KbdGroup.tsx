import { cn } from '@src/lib/utils';

import { kbdGroupVariants } from './KbdGroup.variants';

import type { KbdGroupProps } from './KbdGroup.interface';

/**
 * KbdGroup – Groups multiple keyboard key indicators.
 */
export default function KbdGroup({ children, ...domProps }: KbdGroupProps) {
  return (
    <kbd data-slot="kbd-group" className={cn(kbdGroupVariants())} {...domProps}>
      {children}
    </kbd>
  );
}
