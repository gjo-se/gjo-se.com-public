import { cn } from '@src/lib/utils';

import { kbdVariants } from './Kbd.variants';

import type { KbdProps } from './Kbd.interface';

/**
 * Kbd – Keyboard key indicator.
 */
export default function Kbd({ children, ...domProps }: KbdProps) {
  return (
    <kbd data-slot="kbd" className={cn(kbdVariants())} {...domProps}>
      {children}
    </kbd>
  );
}
