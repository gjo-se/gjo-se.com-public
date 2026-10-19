import { cva, type VariantProps } from 'class-variance-authority';

export const checkboxVariants = cva(
  'peer size-4 shrink-0 rounded-sm border border-input shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary',
  {
    variants: {
      size: {
        default: 'size-4',
        sm: 'size-3.5',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export type CheckboxVariants = VariantProps<typeof checkboxVariants>;
