import { cva, type VariantProps } from 'class-variance-authority';
export const accordionContentVariants = cva('h-(--accordion-panel-height) pt-0 pb-4 data-ending-style:h-0 data-starting-style:h-0 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4', { variants: {}, defaultVariants: {} });
export type AccordionContentVariants = VariantProps<typeof accordionContentVariants>;
