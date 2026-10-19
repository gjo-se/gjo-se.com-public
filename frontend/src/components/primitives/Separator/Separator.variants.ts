import { cva, type VariantProps } from 'class-variance-authority';

export const separatorVariants = cva('shrink-0 bg-border', {
  variants: {
    orientation: {
      horizontal: 'data-horizontal:h-px data-horizontal:w-full',
      vertical: 'data-vertical:w-px data-vertical:self-stretch',
    },
    spacing: {
      none: '',
      'mb-4': 'mb-4',
      'my-6': 'my-6',
      'my-8': 'my-8',
      'mb-10': 'mb-10',
      'my-16': 'my-16',
      'my-24': 'my-24',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
    spacing: 'none',
  },
});

export type SeparatorVariants = VariantProps<typeof separatorVariants>;
