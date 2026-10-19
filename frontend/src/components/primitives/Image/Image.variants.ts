import { cva, type VariantProps } from 'class-variance-authority';

export const imageVariants = cva('h-full w-full', {
  variants: {
    fit: {
      cover: 'object-cover',
      contain: 'object-contain',
    },
    frame: {
      none: '',
      default: 'rounded border border-border',
    },
  },
});

export type ImageVariants = VariantProps<typeof imageVariants>;
