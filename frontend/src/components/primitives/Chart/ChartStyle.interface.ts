import type { ComponentPropsWithoutRef } from 'react';

export interface ChartStyleProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  id: string;
  config: Record<string, { theme?: Record<string, string>; color?: string }>;
}
