import type { AvatarVariants } from './Avatar.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AvatarProps extends AvatarVariants, Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> {
  src?: string;
  alt: string;
  initials?: string;
  name?: string;
  role?: string;
  children?: React.ReactNode;
}
