import type { BreadcrumbVariants } from './Breadcrumb.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface BreadcrumbProps extends BreadcrumbVariants, Omit<ComponentPropsWithoutRef<'nav'>, 'className' | 'style'> {
  items: { label: string; to?: string }[];
  children?: React.ReactNode;
}
