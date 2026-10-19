import { cva, type VariantProps } from 'class-variance-authority';
export const alertTitleVariants = cva('font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground', { variants: {}, defaultVariants: {} });
export type AlertTitleVariants = VariantProps<typeof alertTitleVariants>;
