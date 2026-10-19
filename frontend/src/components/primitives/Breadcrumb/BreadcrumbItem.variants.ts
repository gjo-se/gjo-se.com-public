import { cva, type VariantProps } from 'class-variance-authority';
export const breadcrumbItemVariants = cva('inline-flex items-center gap-1.5', { variants: {}, defaultVariants: {} });
export type BreadcrumbItemVariants = VariantProps<typeof breadcrumbItemVariants>;
