import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';

import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import { accordionTriggerVariants } from './AccordionTrigger.variants';

import type { AccordionTriggerProps } from './AccordionTrigger.interface';

/** AccordionTrigger – Clickable header that expands/collapses an AccordionItem. */
export default function AccordionTrigger({ children, ...domProps }: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger data-slot="accordion-trigger" className={cn(accordionTriggerVariants())} {...domProps}>
        {children}
        <Icon name="chevron-down" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}
