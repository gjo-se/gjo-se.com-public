import { cva, type VariantProps } from 'class-variance-authority';

export const switchVariants = cva(
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary data-unchecked:bg-input',
  {
    variants: {
      size: {
        default: 'h-5 w-9 [&_[data-slot=thumb]]:size-3.5 [&_[data-slot=thumb]]:data-checked:translate-x-3.5',
        sm: 'h-4 w-7 [&_[data-slot=thumb]]:size-2.5 [&_[data-slot=thumb]]:data-checked:translate-x-2.5',
        md: 'h-6 w-10 [&_[data-slot=thumb]]:size-4 [&_[data-slot=thumb]]:data-checked:translate-x-4',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export type SwitchVariants = VariantProps<typeof switchVariants>;
