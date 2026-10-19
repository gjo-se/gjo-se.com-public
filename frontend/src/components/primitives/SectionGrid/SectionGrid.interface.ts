import type { ComponentPropsWithoutRef } from 'react';

export interface SectionGridProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'className'> {
  children?: React.ReactNode;
  /** Spaltenzahl ab `md`. Default `2` (Portfolio). Skills nutzt `6` für die A/B/C-Abstufung. */
  columns?: 2 | 6;
}
