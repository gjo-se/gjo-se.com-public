import { cva, type VariantProps } from 'class-variance-authority';
export const alertDialogDescriptionVariants = cva('text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground', { variants: {}, defaultVariants: {} });
export type AlertDialogDescriptionVariants = VariantProps<typeof alertDialogDescriptionVariants>;
