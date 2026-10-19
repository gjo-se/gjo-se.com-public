import type { ComponentPropsWithoutRef } from 'react';

export interface VideoProps
  extends Omit<ComponentPropsWithoutRef<'video'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
