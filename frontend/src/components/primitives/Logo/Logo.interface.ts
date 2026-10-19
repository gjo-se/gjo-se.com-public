import type { LogoVariants } from './Logo.variants';

export interface LogoProps extends LogoVariants {
  /**
   * Welche finale Marke gerendert wird: Wortmarke (Standard), Combo (Symbol +
   * Wortmarke) oder Favicon (nur mittlerer Pfeil).
   */
  variant?: 'wordmark' | 'combo' | 'favicon';
  /** Accessible name für assistive technology. Defaults zur Wortmarke "gjo:Se". */
  'aria-label'?: string;
  /** Versteckt das Logo vor assistive technology, wenn rein dekorativ. */
  'aria-hidden'?: boolean;
}
