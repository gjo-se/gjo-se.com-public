import { cva, type VariantProps } from 'class-variance-authority';

export const figureVariants = cva(
  'w-full overflow-hidden rounded-xl border border-border bg-surface-muted dark:border-gray-700 dark:bg-gray-800',
  {
    variants: {
      aspectRatio: {
        '16/9': 'aspect-video',
        '4/3': 'aspect-figure',
        '1/1': 'aspect-square',
      },
    },
    defaultVariants: {
      aspectRatio: '16/9',
    },
  },
);

export type FigureVariants = VariantProps<typeof figureVariants>;
