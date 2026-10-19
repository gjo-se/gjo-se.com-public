import { cva, type VariantProps } from 'class-variance-authority';

export const alertDialogVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type AlertDialogVariants = VariantProps<typeof alertDialogVariants>;
