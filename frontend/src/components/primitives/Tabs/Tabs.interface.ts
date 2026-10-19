import type { TabsVariants } from './Tabs.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TabsProps
  extends TabsVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  children?: React.ReactNode;
}
