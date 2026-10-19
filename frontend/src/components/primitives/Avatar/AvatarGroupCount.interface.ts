import type { AvatarGroupCountVariants } from './AvatarGroupCount.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AvatarGroupCountProps
  extends AvatarGroupCountVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
