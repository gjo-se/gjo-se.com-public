import type { AvatarGroupVariants } from './AvatarGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AvatarGroupProps
  extends AvatarGroupVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
