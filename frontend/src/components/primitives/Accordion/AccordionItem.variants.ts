import { cva, type VariantProps } from 'class-variance-authority';
export const accordionItemVariants = cva('not-last:border-b', { variants: {}, defaultVariants: {} });
export type AccordionItemVariants = VariantProps<typeof accordionItemVariants>;
