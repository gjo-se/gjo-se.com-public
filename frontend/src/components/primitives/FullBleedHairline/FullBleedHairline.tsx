import { cn } from '@src/lib/utils';

import type { FullBleedHairlineProps } from './FullBleedHairline.interface';

/**
 * FullBleedHairline – randlose Haarlinie im `100vw`-Breakout am oberen oder unteren
 * Rand eines `relative`-Containers. Reine Deko (`aria-hidden`, `pointer-events-none`),
 * spannt über die volle Viewport-Breite (dank `overflow-x: clip` am Root ohne Scrollbar).
 */
export default function FullBleedHairline({ edge = 'bottom' }: FullBleedHairlineProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute -left-bleed -right-bleed border-border-light',
        edge === 'top' ? 'top-0 border-b' : 'bottom-0 border-t',
      )}
    />
  );
}
