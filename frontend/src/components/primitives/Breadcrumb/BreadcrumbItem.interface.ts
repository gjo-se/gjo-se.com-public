import type { BreadcrumbItemVariants } from './BreadcrumbItem.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface BreadcrumbItemProps
  extends BreadcrumbItemVariants,
    Omit<ComponentPropsWithoutRef<'li'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
