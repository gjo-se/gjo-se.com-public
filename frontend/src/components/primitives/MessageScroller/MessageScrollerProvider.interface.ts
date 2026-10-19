import type { ComponentPropsWithoutRef } from 'react';

export interface MessageScrollerProviderProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
