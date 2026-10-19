import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { useState } from 'react';

import Icon from '@src/components/primitives/Icon/Icon';
import Text from '@src/components/primitives/Text';
import { cn } from '@src/lib/utils';

import { accordionVariants } from './Accordion.variants';

import type { AccordionProps } from './Accordion.interface';

/**
 * Accordion – Expandable content sections.
 */
export default function Accordion({ items, ...domProps }: AccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AccordionPrimitive.Root
      className={cn(accordionVariants())}
      {...domProps}
    >
      {items.map((item) => {
        const isOpen = openIds.has(item.id);
        return (
          <AccordionPrimitive.Item key={item.id} value={item.id}>
            <AccordionPrimitive.Header>
              <AccordionPrimitive.Trigger
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between py-4 text-left text-sm font-medium transition-all hover:underline"
              >
                <Text variant="body" weight="semibold">{item.title}</Text>
                <span className={cn('shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}>
                  <Icon name="chevron-down" />
                </span>
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <AccordionPrimitive.Panel
              className={cn(
                'overflow-hidden text-sm transition-all',
                isOpen ? 'animate-accordion-down' : 'animate-accordion-up',
              )}
            >
              <div className="pb-4 pt-0">{item.content}</div>
            </AccordionPrimitive.Panel>
          </AccordionPrimitive.Item>
        );
      })}
    </AccordionPrimitive.Root>
  );
}
