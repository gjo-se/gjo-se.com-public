import type { BreadcrumbEllipsisVariants } from './BreadcrumbEllipsis.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface BreadcrumbEllipsisProps
  extends BreadcrumbEllipsisVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
