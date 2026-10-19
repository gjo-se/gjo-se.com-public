import type { IconName } from './Icon.registry';
import type { IconVariants } from './Icon.variants';

export interface IconProps extends Omit<IconVariants, 'className' | 'style'> {
  name: IconName;
  shrink?: boolean;
  rotate?: boolean;
  /** Fills the icon shape with the current colour (e.g. an active favorite star). */
  filled?: boolean;
  href?: string;
  external?: boolean;
  label?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
  onClick?: () => void;
}
