import type { TabsTriggerVariants } from './TabsTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TabsTriggerProps
  extends TabsTriggerVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  value: string;
  children?: React.ReactNode;
}
