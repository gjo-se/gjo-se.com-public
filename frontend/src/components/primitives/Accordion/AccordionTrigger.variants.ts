import { cva, type VariantProps } from 'class-variance-authority';
export const accordionTriggerVariants = cva('group/accordion-trigger relative flex flex-1 items-start justify-between rounded-md border border-transparent py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-50', { variants: {}, defaultVariants: {} });
export type AccordionTriggerVariants = VariantProps<typeof accordionTriggerVariants>;
