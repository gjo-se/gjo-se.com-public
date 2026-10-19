import { cva, type VariantProps } from 'class-variance-authority';

export const popoverDescriptionVariants = cva('text-muted-foreground', {
  variants: {},
  defaultVariants: {},
});

export type PopoverDescriptionVariants = VariantProps<typeof popoverDescriptionVariants>;
