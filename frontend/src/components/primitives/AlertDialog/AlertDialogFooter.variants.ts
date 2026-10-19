import { cva, type VariantProps } from 'class-variance-authority';
export const alertDialogFooterVariants = cva('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', { variants: {}, defaultVariants: {} });
export type AlertDialogFooterVariants = VariantProps<typeof alertDialogFooterVariants>;
