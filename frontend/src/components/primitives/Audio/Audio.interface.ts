import type { AudioVariants } from './Audio.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AudioProps
  extends AudioVariants,
    Omit<ComponentPropsWithoutRef<'audio'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
