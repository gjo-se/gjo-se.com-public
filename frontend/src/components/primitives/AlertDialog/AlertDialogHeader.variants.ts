import { cva, type VariantProps } from 'class-variance-authority';

export const alertDialogHeaderVariants = cva(
  'grid grid-rows-alert place-items-center gap-1.5 text-center sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left',
  { variants: {}, defaultVariants: {} },
);

export type AlertDialogHeaderVariants = VariantProps<typeof alertDialogHeaderVariants>;
