import type { AvatarBadgeVariants } from './AvatarBadge.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AvatarBadgeProps
  extends AvatarBadgeVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
