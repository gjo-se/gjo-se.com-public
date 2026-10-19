import { cva, type VariantProps } from 'class-variance-authority';
export const alertDescriptionVariants = cva('text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4', { variants: {}, defaultVariants: {} });
export type AlertDescriptionVariants = VariantProps<typeof alertDescriptionVariants>;
