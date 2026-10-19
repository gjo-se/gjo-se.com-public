import { cn } from '@src/lib/utils';

import { containerVariants } from './Container.variants';

import type { ContainerProps } from './Container.interface';

/**
 * Container – zentrierter Breiten-Container (SOTA-Layout-Primitive).
 *
 * Kapselt `mx-auto w-full` plus eine token-basierte Breitenstufe als `size`-Variant
 * (nie arbitrary): `wide` (Seitenrhythmus), `content` (Inhalts-/Formularspalte),
 * `prose` (Lesemaß), `card` (Panelbreite). `padded` legt das horizontale `px-6` bei.
 * Ersetzt rohe `div`-Wrapper mit `w-full`/`max-w-*` in Consumer-Layern (Kanon Achse B2).
 */
export default function Container({ size, padded, children, ...domProps }: ContainerProps) {
  return (
    <div className={cn(containerVariants({ size, padded }))} {...domProps}>
      {children}
    </div>
  );
}
