import { cva, type VariantProps } from 'class-variance-authority';

export const buttonGroupVariants = cva('flex w-fit items-stretch', {
  variants: {
    orientation: {
      horizontal: '',
      vertical: 'flex-col',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

export type ButtonGroupVariants = VariantProps<typeof buttonGroupVariants>;
