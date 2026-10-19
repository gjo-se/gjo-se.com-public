import type { TextVariants } from './Text.variants';

export interface TextProps extends Omit<TextVariants, 'className' | 'style'> {
  as?: string;
  mono?: boolean;
  uppercase?: boolean;
  /** Ziffern-Ausrichtung (font-variant-numeric: tabular-nums) – z. B. für Score-Zahlen. */
  tabular?: boolean;
  /** Zeilenklemme (`line-clamp-N`) – kürzt mehrzeiligen Text mit Ellipse (z. B. Tabellenzellen). */
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}
