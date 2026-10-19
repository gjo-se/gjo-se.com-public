import { cva, type VariantProps } from 'class-variance-authority';
export const alertDialogTitleVariants = cva('font-heading text-lg font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2', { variants: {}, defaultVariants: {} });
export type AlertDialogTitleVariants = VariantProps<typeof alertDialogTitleVariants>;
