import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';

import { cn } from '@src/lib/utils';

import { accordionContentVariants } from './AccordionContent.variants';

import type { AccordionContentProps } from './AccordionContent.interface';

/** AccordionContent – Expandable content panel inside an AccordionItem. */
export default function AccordionContent({ children, ...domProps }: AccordionContentProps) {
  return (
    <AccordionPrimitive.Panel data-slot="accordion-content" className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up" {...domProps}>
      <div className={cn(accordionContentVariants())}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}
