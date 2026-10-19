import { cva, type VariantProps } from 'class-variance-authority';

export const tableCaptionVariants = cva('mt-4 text-sm text-muted-foreground', {
  variants: {},
  defaultVariants: {},
});

export type TableCaptionVariants = VariantProps<typeof tableCaptionVariants>;
