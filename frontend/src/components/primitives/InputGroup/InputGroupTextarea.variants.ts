import { cva, type VariantProps } from 'class-variance-authority';

export const inputGroupTextareaVariants = cva(
  'flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
  { variants: {}, defaultVariants: {} },
);

export type InputGroupTextareaVariants = VariantProps<typeof inputGroupTextareaVariants>;
