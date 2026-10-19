import type { BreadcrumbPageVariants } from './BreadcrumbPage.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface BreadcrumbPageProps
  extends BreadcrumbPageVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
