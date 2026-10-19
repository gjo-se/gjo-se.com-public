import type { ComponentPropsWithoutRef } from 'react';

export interface TimeProps
  extends Omit<ComponentPropsWithoutRef<'time'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
