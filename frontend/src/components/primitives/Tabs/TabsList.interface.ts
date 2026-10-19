import type { TabsListVariants } from './TabsList.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TabsListProps
  extends TabsListVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
