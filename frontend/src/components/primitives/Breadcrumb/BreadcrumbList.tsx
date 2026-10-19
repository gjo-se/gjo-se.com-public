import { cn } from '@src/lib/utils';

import { breadcrumbListVariants } from './BreadcrumbList.variants';

import type { BreadcrumbListProps } from './BreadcrumbList.interface';

/** BreadcrumbList – Ordered list container for breadcrumb items. */
export default function BreadcrumbList({ children, ...domProps }: BreadcrumbListProps) {
  return <ol data-slot="breadcrumb-list" className={cn(breadcrumbListVariants())} {...domProps}>{children}</ol>;
}
