import { cva, type VariantProps } from 'class-variance-authority';

export const sliderVariants = cva(
  'relative flex w-full touch-none select-none items-center',
  {
    variants: {
      size: {
        default: 'h-5',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

export type SliderVariants = VariantProps<typeof sliderVariants>;
