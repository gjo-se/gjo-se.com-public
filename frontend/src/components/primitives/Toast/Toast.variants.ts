import { cva, type VariantProps } from 'class-variance-authority';

export const toastVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type ToastVariants = VariantProps<typeof toastVariants>;
