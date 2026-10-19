import type { BreadcrumbSeparatorVariants } from './BreadcrumbSeparator.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface BreadcrumbSeparatorProps
  extends BreadcrumbSeparatorVariants,
    Omit<ComponentPropsWithoutRef<'li'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
