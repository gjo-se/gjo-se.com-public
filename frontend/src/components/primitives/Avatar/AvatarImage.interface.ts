import type { AvatarImageVariants } from './AvatarImage.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AvatarImageProps
  extends AvatarImageVariants,
    Omit<ComponentPropsWithoutRef<'img'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
