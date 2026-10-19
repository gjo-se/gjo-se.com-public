import { cn } from '@src/lib/utils';

import { breadcrumbItemVariants } from './BreadcrumbItem.variants';

import type { BreadcrumbItemProps } from './BreadcrumbItem.interface';

/** BreadcrumbItem – Single crumb inside a BreadcrumbList. */
export default function BreadcrumbItem({ children, ...domProps }: BreadcrumbItemProps) {
  return <li data-slot="breadcrumb-item" className={cn(breadcrumbItemVariants())} {...domProps}>{children}</li>;
}
