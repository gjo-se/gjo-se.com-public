import { cva, type VariantProps } from 'class-variance-authority';

export const kbdGroupVariants = cva('inline-flex items-center gap-1', {
  variants: {},
  defaultVariants: {},
});

export type KbdGroupVariants = VariantProps<typeof kbdGroupVariants>;
