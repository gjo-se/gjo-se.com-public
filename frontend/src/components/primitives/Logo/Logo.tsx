import { cn } from '@src/lib/utils';

import { LOGO_SVGS } from './Logo.utils';
import { logoVariants } from './Logo.variants';

import type { LogoProps } from './Logo.interface';

/**
 * Logo – rendert die FINALEN Vektor-Outlines (kein Text, keine Font-Abhängigkeit).
 *
 * Quelle ist der Marken-SSOT `frontend/public/brand/` (wordmark.svg / combo.svg),
 * als React-Komponente via `?react`-Import. Neutrale Teile nutzen `currentColor`
 * und passen sich so dem Theme an; der Kupfer-Akzent ist Teil der Marke.
 * Höhe über `size`, Breite skaliert automatisch (preserveAspectRatio).
 */
export default function Logo({
  size = 'md',
  variant = 'wordmark',
  'aria-label': ariaLabel = 'gjo:Se',
  'aria-hidden': ariaHidden,
}: LogoProps) {
  const Svg = LOGO_SVGS[variant];

  return (
    <Svg
      role="img"
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      className={cn('inline-block select-none', logoVariants({ size }))}
    />
  );
}
