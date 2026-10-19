import { cva, type VariantProps } from 'class-variance-authority';

export const radioGroupVariants = cva('grid w-full gap-3', {
  variants: {
    orientation: {
      vertical: 'grid-flow-row',
      horizontal: 'grid-flow-col',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

export type RadioGroupVariants = VariantProps<typeof radioGroupVariants>;
