import type { BreadcrumbLinkVariants } from './BreadcrumbLink.variants';
import type { useRender } from '@base-ui/react/use-render';
import type { ComponentPropsWithoutRef } from 'react';

export interface BreadcrumbLinkProps
  extends BreadcrumbLinkVariants,
    Omit<ComponentPropsWithoutRef<'a'>, 'className' | 'style'> {
  render?: useRender.ComponentProps<'a'>['render'];
}
