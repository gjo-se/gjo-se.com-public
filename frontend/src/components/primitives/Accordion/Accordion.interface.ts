import type { AccordionVariants } from './Accordion.variants';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export interface AccordionProps extends AccordionVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style' | 'defaultValue'> {
  items: { id: string; title: string; content: ReactNode }[];
  children?: React.ReactNode;
}
