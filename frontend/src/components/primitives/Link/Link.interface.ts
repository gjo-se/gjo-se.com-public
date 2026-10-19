import type { RouteTarget } from '@src/router.derived';

import type { LinkVariants } from './Link.variants';

export interface LinkProps extends Omit<LinkVariants, 'className' | 'style'> {
  to?: string | RouteTarget;
  href?: string;
  hash?: string;
  external?: boolean;
  /** Persistente Unterstreichung (statt nur bei Hover) – z. B. Inline-Links im Fließtext. */
  underline?: boolean;
  'aria-label'?: string;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  children?: React.ReactNode;
}
