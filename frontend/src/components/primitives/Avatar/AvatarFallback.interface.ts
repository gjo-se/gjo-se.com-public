import type { AvatarFallbackVariants } from './AvatarFallback.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AvatarFallbackProps
  extends AvatarFallbackVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
