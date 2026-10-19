import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@src/lib/utils';

import { breadcrumbLinkVariants } from './BreadcrumbLink.variants';

import type { BreadcrumbLinkProps } from './BreadcrumbLink.interface';

/** BreadcrumbLink – Navigable link inside a BreadcrumbItem. Supports render prop. */
export default function BreadcrumbLink({ render, ...props }: BreadcrumbLinkProps) {
  return useRender({ defaultTagName: 'a', props: mergeProps<'a'>({ className: cn(breadcrumbLinkVariants()) }, props), render, state: { slot: 'breadcrumb-link' } });
}
