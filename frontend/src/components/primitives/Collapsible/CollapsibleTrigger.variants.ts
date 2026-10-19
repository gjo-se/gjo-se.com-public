import { cva, type VariantProps } from 'class-variance-authority';

export const collapsibleTriggerVariants = cva(
  'group/collapsible-trigger relative flex w-full items-center gap-2 rounded-md py-2 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type CollapsibleTriggerVariants = VariantProps<typeof collapsibleTriggerVariants>;
