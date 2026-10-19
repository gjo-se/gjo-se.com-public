import { cva, type VariantProps } from 'class-variance-authority';

export const inputGroupVariants = cva(
  'group/input-group relative flex h-9 w-full min-w-0 items-center rounded-md border border-input shadow-xs transition outline-none has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:bg-input/30 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type InputGroupVariants = VariantProps<typeof inputGroupVariants>;
