import type { AccordionItemVariants } from './AccordionItem.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AccordionItemProps
  extends AccordionItemVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
