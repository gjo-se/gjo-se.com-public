import { cva, type VariantProps } from 'class-variance-authority';
export const alertDialogMediaVariants = cva("mb-2 inline-flex size-16 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8", { variants: {}, defaultVariants: {} });
export type AlertDialogMediaVariants = VariantProps<typeof alertDialogMediaVariants>;
