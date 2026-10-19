import type { ComponentPropsWithoutRef } from 'react';

export interface ChartProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
