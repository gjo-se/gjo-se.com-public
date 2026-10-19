import type { AccordionTriggerVariants } from './AccordionTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AccordionTriggerProps
  extends AccordionTriggerVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
