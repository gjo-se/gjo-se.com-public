import { cn } from '@src/lib/utils';

import { breadcrumbEllipsisVariants } from './BreadcrumbEllipsis.variants';

import type { BreadcrumbEllipsisProps } from './BreadcrumbEllipsis.interface';

/** BreadcrumbEllipsis – Collapsed breadcrumb indicator for overflow items. */
export default function BreadcrumbEllipsis({ ...domProps }: BreadcrumbEllipsisProps) {
  return (
    <span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" className={cn(breadcrumbEllipsisVariants())} {...domProps}>
      …
      <span className="sr-only">More</span>
    </span>
  );
}
