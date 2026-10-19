import { SIZE_CLASSES } from './ColorSwatch.utils';

import type { ColorSwatchProps } from './ColorSwatch.interface';

/**
 * ColorSwatch – dekorativer Farbpunkt für Legenden.
 * Rein visuell, ohne semantischen Inhalt (aria-hidden).
 */
export default function ColorSwatch({
  color,
  size = 'sm',
  shape = 'square',
}: ColorSwatchProps) {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-sm';
  return (
    <span
      aria-hidden="true"
      className={`${SIZE_CLASSES[size]} ${shapeClass}`}
      style={{ backgroundColor: color }}
    />
  );
}

export type { ColorSwatchProps } from './ColorSwatch.interface';
