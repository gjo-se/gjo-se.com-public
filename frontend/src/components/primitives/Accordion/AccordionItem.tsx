import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';

import { cn } from '@src/lib/utils';

import { accordionItemVariants } from './AccordionItem.variants';

import type { AccordionItemProps } from './AccordionItem.interface';

/** AccordionItem – Single collapsible section inside an Accordion. */
export default function AccordionItem({ children, ...domProps }: AccordionItemProps) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn(accordionItemVariants())} {...domProps}>{children}</AccordionPrimitive.Item>;
}
