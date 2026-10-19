import type { IconName } from '@src/components/primitives/Icon';

import type { NavButtonVariants } from './NavButton.variants';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * NavButtonProps – geschlossene API (kein `className`/`style`).
 *
 * Styling kommt ausschließlich über `variant`/`tone`; Inhalte über `icon`,
 * `iconStart`, `label`, `iconEnd`.
 */
export interface NavButtonProps
  extends NavButtonVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style' | 'children'> {
  /** Einzel-Icon (Icon-Varianten `icon`/`iconLg`). */
  icon?: IconName;
  /** Führendes Icon (Text-Varianten `menu`/`drawer`). */
  iconStart?: IconName;
  /** Label (Text-Varianten `menu`/`drawer`/`chip`). */
  label?: ReactNode;
  /** Nachgestelltes Icon (Text-Varianten, z. B. Aktiv-Häkchen). */
  iconEnd?: IconName;
}
