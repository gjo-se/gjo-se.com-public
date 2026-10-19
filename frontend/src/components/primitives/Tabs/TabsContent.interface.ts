import type { TabsContentVariants } from './TabsContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TabsContentProps
  extends TabsContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  value: string;
  children?: React.ReactNode;
}
