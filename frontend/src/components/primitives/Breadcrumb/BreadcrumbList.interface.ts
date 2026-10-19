import type { BreadcrumbListVariants } from './BreadcrumbList.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface BreadcrumbListProps
  extends BreadcrumbListVariants,
    Omit<ComponentPropsWithoutRef<'ol'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
