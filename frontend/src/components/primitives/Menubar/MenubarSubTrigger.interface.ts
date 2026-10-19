import type { MenubarSubTriggerVariants } from './MenubarSubTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MenubarSubTriggerProps
  extends MenubarSubTriggerVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  inset?: boolean;
}
