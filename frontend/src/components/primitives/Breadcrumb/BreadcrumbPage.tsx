import { cn } from '@src/lib/utils';

import { breadcrumbPageVariants } from './BreadcrumbPage.variants';

import type { BreadcrumbPageProps } from './BreadcrumbPage.interface';

/** BreadcrumbPage – The current page indicator (non-navigable) in a breadcrumb. */
export default function BreadcrumbPage({ children, ...domProps }: BreadcrumbPageProps) {
  return <span data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" className={cn(breadcrumbPageVariants())} {...domProps}>{children}</span>;
}
