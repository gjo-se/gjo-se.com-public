import type { AccordionContentVariants } from './AccordionContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AccordionContentProps
  extends AccordionContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
