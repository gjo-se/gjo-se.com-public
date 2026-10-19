import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import { breadcrumbSeparatorVariants } from './BreadcrumbSeparator.variants';

import type { BreadcrumbSeparatorProps } from './BreadcrumbSeparator.interface';

/** BreadcrumbSeparator – Visual divider between breadcrumb items. Defaults to chevron. */
export default function BreadcrumbSeparator({ children, ...domProps }: BreadcrumbSeparatorProps) {
  return (
    <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn(breadcrumbSeparatorVariants())} {...domProps}>
      {children ?? <Icon name="chevron-right" />}
    </li>
  );
}
